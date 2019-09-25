const promisifyMock = mockFn => {
  const promise = jest.fn();
  mockFn.mockImplementation(() => ({
    promise
  }));

  return promise;
};

const mockCreateGlobalTable = jest.fn();
const mockCreateGlobalTablePromise = promisifyMock(mockCreateGlobalTable);

const mockDescribeGlobalTable = jest.fn();
const mockDescribeGlobalTablePromise = promisifyMock(mockDescribeGlobalTable);

const mockUpdateGlobalTable = jest.fn();
const mockUpdateGlobalTablePromise = promisifyMock(mockUpdateGlobalTable);

module.exports = {
  mockCreateGlobalTable,
  mockCreateGlobalTablePromise,
  mockDescribeGlobalTable,
  mockDescribeGlobalTablePromise,
  mockUpdateGlobalTable,
  mockUpdateGlobalTablePromise,

  DynamoDB: jest.fn(() => ({
    createGlobalTable: mockCreateGlobalTable,
    describeGlobalTable: mockDescribeGlobalTable,
    updateGlobalTable: mockUpdateGlobalTable
  }))
};
