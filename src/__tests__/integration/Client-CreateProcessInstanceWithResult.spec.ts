import { ZBClient } from '../..'
import { createUniqueTaskType } from '../../lib/createUniqueTaskType'

process.env.ZEEBE_NODE_LOG_LEVEL = process.env.ZEEBE_NODE_LOG_LEVEL || 'NONE'
jest.setTimeout(25000)

let zbc: ZBClient

beforeEach(async () => {
	zbc = new ZBClient()
})

afterEach(async () => {
	await zbc.close() // Makes sure we don't forget to close connection
})

test('Awaits a process outcome', async () => {
	const { processId, bpmn } = createUniqueTaskType({
		bpmnFilePath: './src/__tests__/testdata/await-outcome.bpmn',
		messages: [],
		taskTypes: [],
	})
	await zbc.deployProcess({
		definition: bpmn,
		name: `Await-outcome-${processId}.bpmn`,
	})
	const result = await zbc.createProcessInstanceWithResult(processId, {
		sourceValue: 5,
	})
	expect(result.variables.sourceValue).toBe(5)
})

test('can override the gateway timeout', async () => {
	const { bpmn, processId } = createUniqueTaskType({
		bpmnFilePath: './src/__tests__/testdata/await-outcome-long.bpmn',
		messages: [],
		taskTypes: [],
	})
	await zbc.deployProcess({
		definition: bpmn,
		name: `Await-outcome-long-${processId}.bpmn`,
	})
	const result = await zbc.createProcessInstanceWithResult({
		bpmnProcessId: processId,
		requestTimeout: 25000,
		variables: {
			otherValue: 'rome',
			sourceValue: 5,
		},
	})
	expect(result.variables.sourceValue).toBe(5)
})

test('fetches a subset of variables', async () => {
	zbc = new ZBClient()
	const { bpmn, processId } = createUniqueTaskType({
		bpmnFilePath: './src/__tests__/testdata/await-outcome.bpmn',
		messages: [],
		taskTypes: [],
	})
	await zbc.deployProcess({
		definition: bpmn,
		name: `Await-outcome-${processId}.bpmn`,
	})
	const result = await zbc.createProcessInstanceWithResult({
		bpmnProcessId: processId,
		fetchVariables: ['otherValue'],
		variables: {
			otherValue: 'rome',
			sourceValue: 5,
		},
	})
	// @TODO - uncomment when https://github.com/zeebe-io/zeebe/pull/3253 gets merged
	expect(result.variables.sourceValue).toBe(undefined)
	expect(result.variables.otherValue).toBe('rome')
})
