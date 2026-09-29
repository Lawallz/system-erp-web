import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
beforeEach(() => {
  localStorage.clear()
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
})
afterEach(cleanup)
