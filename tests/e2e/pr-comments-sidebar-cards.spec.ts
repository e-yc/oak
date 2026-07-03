import type { Locator } from '@stablyai/playwright-test'
import { test, expect } from './helpers/oak-app'
import { openChecks } from './helpers/source-control-ai-generation'
import { seedPRCommentsSidebarFixture } from './helpers/pr-comments-sidebar-fixture'
import { waitForActiveWorktree, waitForSessionReady } from './helpers/store'

async function visibleTextX(card: Locator, text: string): Promise<number> {
  const textBox = await card.evaluate((element, targetText) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const node = walker.currentNode
      const value = node.textContent ?? ''
      const index = value.indexOf(targetText)
      if (index === -1) {
        continue
      }
      const range = document.createRange()
      range.setStart(node, index)
      range.setEnd(node, index + targetText.length)
      const rect = range.getBoundingClientRect()
      return { x: rect.x }
    }
    return null
  }, text)
  if (!textBox) {
    throw new Error(`visible text not found: ${text}`)
  }
  return textBox.x
}

async function expectOpenTextNotShiftedLeft(
  openCard: Locator,
  conversationCard: Locator,
  openText: string,
  conversationText: string
): Promise<void> {
  const delta =
    (await visibleTextX(openCard, openText)) -
    (await visibleTextX(conversationCard, conversationText))
  // Why: the open rail is a real border, but focused row actions must not scroll content left.
  expect(delta).toBeGreaterThanOrEqual(0)
  expect(delta).toBeLessThanOrEqual(3)
}

test.describe('PR comments sidebar cards view', () => {
  test.beforeEach(async ({ oakPage }) => {
    await waitForSessionReady(oakPage)
    await waitForActiveWorktree(oakPage)
  })

  test('groups open, conversation, and resolved comments in cards layout', async ({ oakPage }) => {
    const { worktreeId } = await seedPRCommentsSidebarFixture(oakPage)
    await openChecks(oakPage, worktreeId)

    const commentsSection = oakPage.getByText('Comments', { exact: true })
    await expect(commentsSection).toBeVisible({ timeout: 10_000 })

    await expect(oakPage.getByText('Needs review · 1')).toBeVisible()
    await expect(oakPage.getByText('Please update this handler before merge.')).toBeVisible()
    await expect(oakPage.getByText('alice')).toBeVisible()
    await expect(oakPage.getByText('Open', { exact: true })).toBeVisible()
    await expect(oakPage.getByText('LGTM on the overall approach.')).toBeVisible()

    const openThreadCard = oakPage.getByTestId('pr-comment-group').filter({
      hasText: 'Please update this handler before merge.'
    })
    const conversationCard = oakPage.getByTestId('pr-comment-group').filter({
      hasText: 'LGTM on the overall approach.'
    })
    await expect(openThreadCard).toBeVisible()
    await expect(conversationCard).toBeVisible()
    await expect(openThreadCard).toHaveClass(/shadow-xs/)
    await expectOpenTextNotShiftedLeft(
      openThreadCard,
      conversationCard,
      'Please update this handler before merge.',
      'LGTM on the overall approach.'
    )
    await expectOpenTextNotShiftedLeft(openThreadCard, conversationCard, 'alice', 'bob')

    const resolvedTrigger = oakPage.getByRole('button', { name: 'Resolved · 1' })
    await expect(resolvedTrigger).toBeVisible()
    await expect(oakPage.getByText('Already fixed upstream.')).toBeHidden()

    await resolvedTrigger.click()
    await expect(oakPage.getByText('Already fixed upstream.')).toBeVisible()
    await expect(oakPage.getByText('Resolved', { exact: true })).toBeVisible()
    await expect(
      oakPage
        .getByTestId('pr-comment-group')
        .filter({ hasText: 'Already fixed upstream.' })
        .getByRole('button', { name: 'Unresolve', exact: true })
    ).toBeVisible()

    await expect(oakPage.getByRole('button', { name: /^Add$/ })).toHaveCount(0)
  })

  test('can switch from grouped to chronological timeline order', async ({ oakPage }) => {
    const { worktreeId } = await seedPRCommentsSidebarFixture(oakPage)
    await openChecks(oakPage, worktreeId)

    await expect(oakPage.getByText('Needs review · 1')).toBeVisible({ timeout: 10_000 })
    await oakPage.getByRole('button', { name: 'Comment display options' }).click()
    await oakPage.getByRole('menuitemradio', { name: 'Timeline' }).click()

    await expect(oakPage.getByText('Needs review · 1')).toHaveCount(0)
    await expect(oakPage.getByText('Already fixed upstream.')).toBeVisible()

    const comments = [
      oakPage.getByText('Already fixed upstream.'),
      oakPage.getByText('Please update this handler before merge.'),
      oakPage.getByText('LGTM on the overall approach.')
    ]
    const positions = await Promise.all(
      comments.map(async (comment) => {
        const box = await comment.boundingBox()
        if (!box) {
          throw new Error(`Comment not visible: ${await comment.textContent()}`)
        }
        return box.y
      })
    )

    expect(positions[0]).toBeLessThan(positions[1])
    expect(positions[1]).toBeLessThan(positions[2])
  })

  test('queues an open thread for the agent from the visible row action and menu fallback', async ({
    oakPage
  }) => {
    const { worktreeId } = await seedPRCommentsSidebarFixture(oakPage)
    await openChecks(oakPage, worktreeId)

    await expect(oakPage.getByText('Needs review · 1')).toBeVisible({ timeout: 10_000 })

    const openThreadCard = oakPage.getByTestId('pr-comment-group').filter({
      hasText: 'Please update this handler before merge.'
    })
    await openThreadCard.hover()
    const visibleQueueButton = openThreadCard.getByRole('button', { name: 'Queue for agent' })
    await expect(visibleQueueButton).toBeVisible()
    await visibleQueueButton.click()
    await expect(visibleQueueButton).toBeHidden()
    await expect(
      oakPage.getByRole('button', { name: 'Send 1 queued comments to AI' })
    ).toBeVisible()
    await expect(oakPage.getByText('Queued', { exact: true })).toBeVisible()

    await oakPage.getByRole('button', { name: 'Clear queued comments' }).click()
    await expect(oakPage.getByRole('button', { name: 'Send 1 queued comments to AI' })).toBeHidden()
    await openThreadCard.hover()
    await expect(visibleQueueButton).toBeVisible()

    const actionsMenu = openThreadCard.getByRole('button', { name: 'More comment actions' })
    await actionsMenu.evaluate((element) => (element as HTMLElement).focus())
    await actionsMenu.press('Enter')
    const queueMenuItem = oakPage.getByRole('menuitem', { name: 'Queue for agent' })
    await queueMenuItem.click({ force: true })
    await expect(queueMenuItem).toBeHidden()

    await expect(
      oakPage.getByRole('button', { name: 'Send 1 queued comments to AI' })
    ).toBeVisible()
    await expect(oakPage.getByText('Queued', { exact: true })).toBeVisible()

    const queuedCard = oakPage.getByTestId('pr-comment-group').filter({
      hasText: 'Please update this handler before merge.'
    })
    const queuedCardBox = await queuedCard.boundingBox()
    const checkboxBox = await oakPage
      .getByRole('checkbox', { name: 'Select comment' })
      .first()
      .boundingBox()
    if (!queuedCardBox || !checkboxBox) {
      throw new Error('queued card and checkbox must be measurable')
    }
    expect(checkboxBox.x - queuedCardBox.x).toBeGreaterThanOrEqual(8)
  })

  test('keeps open card content aligned while the row menu is open', async ({ oakPage }) => {
    const { worktreeId } = await seedPRCommentsSidebarFixture(oakPage)
    await openChecks(oakPage, worktreeId)

    await expect(oakPage.getByText('Needs review · 1')).toBeVisible({ timeout: 10_000 })
    const openThreadCard = oakPage.getByTestId('pr-comment-group').filter({
      hasText: 'Please update this handler before merge.'
    })
    const conversationCard = oakPage.getByTestId('pr-comment-group').filter({
      hasText: 'LGTM on the overall approach.'
    })

    await openThreadCard.hover()
    const actionsMenu = openThreadCard.getByRole('button', { name: 'More comment actions' })
    await actionsMenu.evaluate((element) => (element as HTMLElement).focus())
    await actionsMenu.press('Enter')
    await expect(oakPage.getByRole('menuitem', { name: 'Queue for agent' })).toBeVisible()

    await expectOpenTextNotShiftedLeft(
      openThreadCard,
      conversationCard,
      'Please update this handler before merge.',
      'LGTM on the overall approach.'
    )
  })
})
