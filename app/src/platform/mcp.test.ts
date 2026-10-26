import { describe, expect, it } from 'vitest'
// @ts-expect-error ESM script
import { fromFirestoreDoc, handleRpcMessage, toFirestoreValue, TOOLS } from '../../scripts/mcp-server.mjs'

describe('MCP сервер TickTick 2.0', () => {
  it('возвращает корректный ответ на initialize и список из 10 инструментов на tools/list', async () => {
    const initRes = await handleRpcMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' },
    })
    expect(initRes).toEqual({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'ticktick2-mcp', version: '2.0.0' },
      },
    })

    const listRes = await handleRpcMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    })
    expect(listRes.result.tools).toHaveLength(10)
    expect(TOOLS.map((t: { name: string }) => t.name)).toEqual([
      'get_agenda',
      'list_tasks',
      'create_task',
      'update_task',
      'complete_task',
      'delete_task',
      'list_projects',
      'create_project',
      'list_habits',
      'checkin_habit',
    ])
  })

  it('корректно преобразует поля задачи в формат Firestore REST API и обратно', () => {
    const sample = {
      title: 'Проверить MCP',
      priority: 5,
      isAllDay: true,
      tags: ['ai', 'mcp'],
      items: {
        i1: { title: 'Подпункт 1', done: false, sortOrder: 0 },
      },
      completedAt: null,
    }
    const fields = Object.fromEntries(Object.entries(sample).map(([k, v]) => [k, toFirestoreValue(v)]))
    const restored = fromFirestoreDoc({
      name: 'projects/ticktick-47613/databases/(default)/documents/users/u1/tasks/task123',
      fields,
    })
    expect(restored).toEqual({
      id: 'task123',
      ...sample,
    })
  })
})

