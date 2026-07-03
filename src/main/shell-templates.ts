// Why: local PTYs and the daemon/SSH path must use identical ZDOTDIR discovery;
// small drift here breaks different terminal transports in different ways.

function quotePosixSingle(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`
}

export function getZshEnvTemplate(zshDir: string, headerPrefix = ''): string {
  const header = headerPrefix
    ? `Oak ${headerPrefix} zsh shell-ready wrapper`
    : 'Oak zsh shell-ready wrapper'
  return `# ${header}
_oak_spawn_orig_zdotdir="\${OAK_ORIG_ZDOTDIR:-}"
_oak_user_zdotdir="\${_oak_spawn_orig_zdotdir:-$HOME}"
_oak_zshenv_source_dir="\${OAK_ZSHENV_SOURCE_DIR:-$HOME}"
_oak_zshenv_path=""
unset OAK_ZSHENV_SOURCE_DIR

# Normalize fallback and source roots before reading user .zshenv so nested
# Oak PTYs never source another Oak wrapper recursively.
while [[ "\${_oak_user_zdotdir}" == */ ]]; do
  _oak_user_zdotdir="\${_oak_user_zdotdir%/}"
done
case "\${_oak_user_zdotdir}" in
  ""|*/shell-ready/zsh) _oak_user_zdotdir="$HOME" ;;
esac
while [[ "\${_oak_zshenv_source_dir}" == */ ]]; do
  _oak_zshenv_source_dir="\${_oak_zshenv_source_dir%/}"
done
case "\${_oak_zshenv_source_dir}" in
  ""|*/shell-ready/zsh) _oak_zshenv_source_dir="$HOME" ;;
esac

# Why: source at wrapper top level, not in a function/subshell, so .zshenv
# exports, functions, path/fpath typesets, and zsh options keep normal scope.
unset ZDOTDIR
if [[ -n "\${_oak_zshenv_source_dir:-}" && -f "\${_oak_zshenv_source_dir}/.zshenv" ]]; then
  _oak_zshenv_path="\${_oak_zshenv_source_dir}/.zshenv"
fi
if [[ -n "\${_oak_zshenv_path:-}" ]]; then
  source "\${_oak_zshenv_path}"
fi

_oak_discovered_zdotdir="\${ZDOTDIR:-}"

while [[ "\${_oak_discovered_zdotdir}" == */ ]]; do
  _oak_discovered_zdotdir="\${_oak_discovered_zdotdir%/}"
done

case "\${_oak_discovered_zdotdir}" in
  *[![:space:]]*) ;;
  *) _oak_discovered_zdotdir="" ;;
esac

if [[ -n "\${_oak_discovered_zdotdir}" && ! -d "\${_oak_discovered_zdotdir}" ]]; then
  [[ "\${OAK_DEBUG:-0}" == "1" ]] && echo "[oak-shell-ready] Discovered ZDOTDIR '\${_oak_discovered_zdotdir}' does not exist, falling back" >&2
  _oak_discovered_zdotdir=""
fi

export OAK_ORIG_ZDOTDIR="\${_oak_discovered_zdotdir:-\${_oak_user_zdotdir:-$HOME}}"

while [[ "\${OAK_ORIG_ZDOTDIR}" == */ ]]; do
  OAK_ORIG_ZDOTDIR="\${OAK_ORIG_ZDOTDIR%/}"
done

case "\${OAK_ORIG_ZDOTDIR}" in
  ""|*/shell-ready/zsh) export OAK_ORIG_ZDOTDIR="$HOME" ;;
esac

export ZDOTDIR=${quotePosixSingle(zshDir)}
unset _oak_spawn_orig_zdotdir _oak_user_zdotdir _oak_zshenv_source_dir _oak_zshenv_path _oak_discovered_zdotdir
`
}

export function getZshStartupFileSourceBlock(options: {
  fileName: '.zprofile' | '.zshrc' | '.zlogin'
  homeExpression?: string
  interactiveOnly?: boolean
  skipWhenHomeIsCurrentZdotdir?: boolean
}): string {
  const homeExpression = options.homeExpression ?? '"${OAK_ORIG_ZDOTDIR:-$HOME}"'
  const checks = [
    options.skipWhenHomeIsCurrentZdotdir ? '"$_oak_home" != "$ZDOTDIR"' : null,
    options.interactiveOnly ? '-o interactive' : null,
    `-f "$_oak_home/${options.fileName}"`
  ].filter(Boolean)

  return `_oak_home=${homeExpression}
case "\${_oak_home%/}" in
  */shell-ready/zsh) _oak_home="$HOME" ;;
esac
if [[ ${checks.join(' && ')} ]]; then
  _oak_wrapper_zdotdir="$ZDOTDIR"
  # Why: user startup files resolve plugin/config paths from their own ZDOTDIR;
  # Oak restores its wrapper dir afterward so zsh still loads wrapper files.
  export ZDOTDIR="$_oak_home"
  source "$_oak_home/${options.fileName}"
  export ZDOTDIR="$_oak_wrapper_zdotdir"
  unset _oak_wrapper_zdotdir
fi
`
}

// Why: zsh precmd fires before zle switches the PTY into line-editing mode,
// so the marker must be emitted from zle-line-init. Registering it through
// add-zle-hook-widget is unsafe: the azhw dispatcher aborts its hook chain
// when an earlier hook exits non-zero, and a pre-existing raw user widget
// (e.g. oh-my-zsh vi-mode without VI_MODE_SET_CURSOR) is preserved as the
// first hook and fails — silently suppressing the marker and stalling every
// startup command on the pre-ready timeout. Instead, own zle-line-init: emit
// the marker first, then chain to whatever widget was installed before.
export function getZshShellReadyMarkerRegistrationBlock(escapedMarker: string): string {
  return `if [[ "\${OAK_SHELL_READY_MARKER:-0}" == "1" ]]; then
  # Why: capture the prior zle-line-init so the marker chains to it. On a
  # re-source we are already the bound widget, so keep the function captured
  # the first time instead of clobbering it to empty (which would silently
  # drop the user's widget on every prompt after the second source). Only
  # user-defined widgets are chainable as plain functions; builtin/completion
  # forms (rare for zle-line-init) are left unchained.
  if [[ "\${widgets[zle-line-init]:-}" == "user:__oak_prompt_mark" ]]; then
    :
  elif (( \${+widgets[zle-line-init]} )) && [[ "\${widgets[zle-line-init]}" == user:* ]]; then
    __oak_prev_line_init_fn="\${widgets[zle-line-init]#user:}"
  else
    __oak_prev_line_init_fn=""
  fi
  __oak_prompt_mark() {
    printf "${escapedMarker}"
    # Why: call the prior hook as a plain function, not an aliased widget, so
    # $WIDGET stays zle-line-init for add-zle-hook-widget dispatchers.
    if [[ -n "\${__oak_prev_line_init_fn:-}" ]]; then
      "\${__oak_prev_line_init_fn}" "$@"
    fi
  }
  zle -N zle-line-init __oak_prompt_mark
fi
`
}

export function getZshFinalZdotdirRestoreBlock(homeExpression = '"${OAK_ORIG_ZDOTDIR:-$HOME}"') {
  return `_oak_home=${homeExpression}
case "\${_oak_home%/}" in
  */shell-ready/zsh) _oak_home="$HOME" ;;
esac
# Why: after Oak's last wrapper file has loaded, the interactive shell should
# expose the same ZDOTDIR a normal zsh startup would expose.
export ZDOTDIR="$_oak_home"
unset _oak_home
`
}
