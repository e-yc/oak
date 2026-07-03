import { execFile, spawn, type ChildProcess } from 'node:child_process'
import { access, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const RUNTIME_METADATA_FILE = 'oak-runtime.json'
let oakDevUserDataPath: string | null = null
let oakServeProcess: ChildProcess | null = null
let oakServeStdout = ''
let oakServeStderr = ''

export type CliResult = {
  stdout: string
  stderr: string
}

type RunOakCliOptions = {
  retryMissingRuntimeMetadata?: boolean
}

export async function runOakCli(
  args: string[],
  options: RunOakCliOptions = {}
): Promise<CliResult> {
  try {
    return await runOakCliOnce(args)
  } catch (error) {
    if (
      options.retryMissingRuntimeMetadata !== false &&
      isMissingRuntimeMetadataError(args, error)
    ) {
      // Why: Windows CI can let the dev runtime exit while launching the
      // fixture app; reopen once so the desktop action gets a live runtime.
      await ensureOakRuntimeLaunched()
      return await runOakCliOnce(args)
    }
    throw error
  }
}

async function runOakCliOnce(args: string[]): Promise<CliResult> {
  const devCli = join(process.cwd(), 'config/scripts/oak-dev.mjs')
  const command = process.env.OAK_COMPUTER_CLI ?? process.execPath
  const cliArgs = process.env.OAK_COMPUTER_CLI ? args : [devCli, ...args]
  const env = { ...process.env }
  if (!process.env.OAK_COMPUTER_CLI && !env.OAK_DEV_USER_DATA_PATH) {
    env.OAK_DEV_USER_DATA_PATH = await getComputerE2eOakDevUserDataPath()
  }
  try {
    const result = await execFileAsync(command, cliArgs, {
      env,
      maxBuffer: 20 * 1024 * 1024
    })
    return { stdout: result.stdout, stderr: result.stderr }
  } catch (error) {
    if (error && typeof error === 'object' && 'stdout' in error && 'stderr' in error) {
      const output = error as { message: string; stdout: string; stderr: string }
      throw new Error(`${output.message}\nstdout:\n${output.stdout}\nstderr:\n${output.stderr}`)
    }
    throw error
  }
}

export async function ensureOakRuntimeLaunched(): Promise<void> {
  if (!process.env.OAK_COMPUTER_CLI && process.platform === 'win32') {
    await ensureOakRuntimeServed()
    return
  }
  await runOakCli(['open', '--json'], { retryMissingRuntimeMetadata: false })
  await waitForOakRuntimeReady()
}

export async function stopOakRuntime(): Promise<void> {
  const processToStop = oakServeProcess
  if (!processToStop?.pid) {
    return
  }
  oakServeProcess = null
  if (process.platform === 'win32') {
    try {
      await execFileAsync('taskkill.exe', ['/PID', String(processToStop.pid), '/T', '/F'])
    } catch {
      // The foreground test runtime may already have exited.
    }
    return
  }
  processToStop.kill()
}

export function parseJsonOutput<T>(stdout: string): T {
  return JSON.parse(stdout) as T
}

async function getComputerE2eOakDevUserDataPath(): Promise<string> {
  if (!oakDevUserDataPath) {
    // Why: the shared oak-dev profile can keep an older runtime alive across
    // local test runs, making computer-use E2E exercise stale provider code.
    oakDevUserDataPath = await mkdtemp(join(tmpdir(), 'oak-computer-runtime-'))
  }
  return oakDevUserDataPath
}

async function waitForOakRuntimeReady(): Promise<void> {
  const userDataPath = await getComputerE2eOakDevUserDataPath()
  const metadataPath = join(userDataPath, RUNTIME_METADATA_FILE)
  const deadline = Date.now() + 15000
  let lastError: unknown = null

  while (Date.now() < deadline) {
    try {
      await access(metadataPath)
      const status = parseJsonOutput<{
        result: { runtime: { reachable: boolean } }
      }>((await runOakCli(['status', '--json'], { retryMissingRuntimeMetadata: false })).stdout)
      if (status.result.runtime.reachable) {
        return
      }
    } catch (error) {
      lastError = error
    }
    await delay(250)
  }

  const detail = [
    lastError instanceof Error ? `Last error: ${lastError.message}` : null,
    oakServeStdout.trim() ? `serve stdout: ${oakServeStdout.trim()}` : null,
    oakServeStderr.trim() ? `serve stderr: ${oakServeStderr.trim()}` : null
  ]
    .filter(Boolean)
    .join(' ')
  throw new Error(`Oak runtime metadata was not ready at ${metadataPath}.${detail}`)
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureOakRuntimeServed(): Promise<void> {
  if (!oakServeProcess || oakServeProcess.exitCode !== null) {
    const devCli = join(process.cwd(), 'config/scripts/oak-dev.mjs')
    const env = {
      ...process.env,
      OAK_DEV_USER_DATA_PATH: await getComputerE2eOakDevUserDataPath()
    }
    oakServeStdout = ''
    oakServeStderr = ''
    oakServeProcess = spawn(process.execPath, [devCli, 'serve', '--no-pairing', '--json'], {
      env,
      windowsHide: true
    })
    oakServeProcess.stdout?.on('data', (chunk) => {
      oakServeStdout += String(chunk)
    })
    oakServeProcess.stderr?.on('data', (chunk) => {
      oakServeStderr += String(chunk)
    })
    oakServeProcess.once('exit', () => {
      oakServeProcess = null
    })
    process.once('exit', () => {
      oakServeProcess?.kill()
    })
  }
  await waitForOakRuntimeReady()
}

function isMissingRuntimeMetadataError(args: string[], error: unknown): boolean {
  if (args[0] !== 'computer') {
    return false
  }
  if (!error || typeof error !== 'object' || !('message' in error)) {
    return false
  }
  const message = String((error as { message?: unknown }).message)
  return (
    message.includes('"code": "runtime_unavailable"') &&
    message.includes('Could not read Oak runtime metadata')
  )
}
