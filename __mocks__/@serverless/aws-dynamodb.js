const mockDynamoDB = jest.fn();
const mockDynamoDBRemove = jest.fn();

const dynamodb = jest.fn(id => {
  const dynamodb = mockDynamoDB;
  dynamodb.init = () => {};
  dynamodb.default = () => {};
  dynamodb.context = {};
  dynamodb.id = id;
  dynamodb.remove = mockDynamoDBRemove;
  return dynamodb;
});

dynamodb.mockDynamoDB = mockDynamoDB;
dynamodb.mockDynamoDBRemove = mockDynamoDBRemove;

module.exports = dynamodb;
