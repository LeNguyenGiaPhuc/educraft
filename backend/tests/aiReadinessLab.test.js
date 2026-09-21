import assert from 'node:assert/strict'
import { mkdtemp, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { requireApiKey, runLab } from '../ai-readiness-lab/run.js'

test('readiness lab requires an API key before creating evidence output', async () => {
  assert.throws(
    () => requireApiKey({ GEMINI_API_KEY: '' }),
    /GEMINI_API_KEY/,
  )

  const outputRoot = await mkdtemp(path.join(os.tmpdir(), 'educraft-ai-lab-'))
  await assert.rejects(
    runLab({
      env: { GEMINI_API_KEY: '' },
      outputRoot,
    }),
    /GEMINI_API_KEY/,
  )
  assert.deepEqual(await readdir(outputRoot), [])
})
