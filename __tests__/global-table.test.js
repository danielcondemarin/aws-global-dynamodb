const util = require("util");
const path = require("path");
const os = require("os");
const fs = require("fs");

const {
  mockDynamoDB,
  mockDynamoDBRemove
} = require("@serverless/aws-dynamodb");
const GlobalDynamoDBTableComponent = require("../serverless");

const {
  mockCreateGlobalTable,
  mockCreateGlobalTablePromise,
  mockDescribeGlobalTable,
  mockDescribeGlobalTablePromise,
  mockUpdateGlobalTable
} = require("aws-sdk");

const createComponent = async () => {
  // create tmp folder to avoid state collisions between tests
  const mkdtemp = util.promisify(fs.mkdtemp);
  const tmpFolder = await mkdtemp(path.join(os.tmpdir(), "test-"));

  const component = new GlobalDynamoDBTableComponent("TestCloudFront", {
    stateRoot: tmpFolder
  });

  await component.init();

  return component;
};

describe("Component tests", () => {
  const attributeDefinitions = [
    {
      AttributeName: "id",
      AttributeType: "S"
    }
  ];

  const keySchema = [
    {
      AttributeName: "id",
      KeyType: "HASH"
    }
  ];

  describe("Create & Delete", () => {
    let component;

    beforeAll(async () => {
      const resp = {
        GlobalTableDescription: {}
      };

      mockDescribeGlobalTablePromise.mockRejectedValueOnce(
        new Error("GlobalTable not found")
      );
      mockCreateGlobalTablePromise.mockResolvedValueOnce(resp);
      mockCreateGlobalTablePromise.mockResolvedValueOnce(resp);

      component = await createComponent();

      await component.default({
        tableName: "MyGlobalTable",
        replicationGroup: ["eu-west-1", "us-west-1"],
        attributeDefinitions,
        keySchema
      });
    });

    it("creates a DynamoDB table for each region in the inputs", () => {
      expect(mockDynamoDB).toBeCalledTimes(2);
      expect(mockDynamoDB).toBeCalledWith({
        name: "MyGlobalTable",
        region: "eu-west-1",
        attributeDefinitions,
        keySchema,
        stream: true
      });
      expect(mockDynamoDB).toBeCalledWith({
        name: "MyGlobalTable",
        region: "us-west-1",
        attributeDefinitions,
        keySchema,
        stream: true
      });
    });

    it("creates replication group", () => {
      expect(mockCreateGlobalTable).toBeCalledWith({
        GlobalTableName: "MyGlobalTable",
        ReplicationGroup: [
          {
            RegionName: "eu-west-1"
          },
          {
            RegionName: "us-west-1"
          }
        ]
      });
    });

    it("deletes the table created in each region", async () => {
      mockDescribeGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {
          ReplicationGroup: [
            {
              RegionName: "eu-west-1"
            },
            {
              RegionName: "us-west-1"
            }
          ]
        }
      });

      await component.remove();

      expect(mockDescribeGlobalTable).toBeCalledWith({
        GlobalTableName: "MyGlobalTable"
      });
      expect(mockDynamoDBRemove).toBeCalledTimes(2);
    });
  });

  describe("Update", () => {
    beforeEach(() => {
      mockDynamoDB.mockClear();
      mockDynamoDBRemove.mockClear();
      mockCreateGlobalTablePromise.mockClear();
      mockDescribeGlobalTablePromise.mockClear();
      mockUpdateGlobalTable.mockClear();
    });

    it("When input regions match deployed regions no updates happen", async () => {
      mockCreateGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {}
      });
      mockDescribeGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {
          ReplicationGroup: []
        }
      });
      mockDescribeGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {
          ReplicationGroup: [
            {
              RegionName: "eu-west-1"
            },
            {
              RegionName: "us-west-1"
            }
          ]
        }
      });

      const component = await createComponent();

      await component.default({
        tableName: "MyGlobalTable",
        replicationGroup: ["eu-west-1", "us-west-1"],
        attributeDefinitions,
        keySchema
      });

      mockDynamoDB.mockClear();

      await component.default({
        tableName: "MyGlobalTable",
        replicationGroup: ["us-west-1", "eu-west-1"],
        attributeDefinitions,
        keySchema
      });

      expect(mockDynamoDB).toBeCalledTimes(0);
    });

    it("When new input region is found but is not deployed, a new table is created and added to replication group", async () => {
      mockCreateGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {}
      });
      mockDescribeGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {
          ReplicationGroup: [
            {
              RegionName: "eu-west-1"
            }
          ]
        }
      });

      const component = await createComponent();

      await component.default({
        tableName: "MyGlobalTable",
        replicationGroup: ["eu-west-1", "us-west-1"],
        attributeDefinitions,
        keySchema
      });

      expect(mockDynamoDB).toBeCalledTimes(1);
      expect(mockDynamoDB).toBeCalledWith({
        name: "MyGlobalTable",
        region: "us-west-1",
        attributeDefinitions: attributeDefinitions,
        keySchema: keySchema,
        stream: true
      });
      expect(mockUpdateGlobalTable).toBeCalledWith({
        GlobalTableName: "MyGlobalTable",
        ReplicaUpdates: [
          {
            Create: {
              RegionName: "us-west-1"
            }
          }
        ]
      });
    });

    it("When input region is removed but deployed, table is deleted and is removed from replication group", async () => {
      mockCreateGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {}
      });
      mockDescribeGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {
          ReplicationGroup: [
            {
              RegionName: "eu-west-1"
            },
            {
              RegionName: "us-west-1"
            }
          ]
        }
      });

      const component = await createComponent();

      await component.default({
        tableName: "MyGlobalTable",
        replicationGroup: ["eu-west-1"],
        attributeDefinitions,
        keySchema
      });

      expect(mockDynamoDB).toBeCalledTimes(0);
      expect(mockDynamoDBRemove).toBeCalledTimes(1);
      expect(mockUpdateGlobalTable).toBeCalledWith({
        GlobalTableName: "MyGlobalTable",
        ReplicaUpdates: [
          {
            Delete: {
              RegionName: "us-west-1"
            }
          }
        ]
      });
    });

    it("When global table is renamed", async () => {
      expect.assertions(4);

      mockCreateGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {}
      });
      mockDescribeGlobalTablePromise.mockResolvedValueOnce({
        GlobalTableDescription: {
          ReplicationGroup: [
            {
              RegionName: "eu-west-1"
            },
            {
              RegionName: "us-west-1"
            }
          ]
        }
      });

      const component = await createComponent();

      await component.default({
        tableName: "MyGlobalTable",
        replicationGroup: ["eu-west-1"],
        attributeDefinitions,
        keySchema
      });

      mockDynamoDB.mockClear();
      mockDynamoDBRemove.mockClear();
      mockUpdateGlobalTable.mockClear();

      try {
        await component.default({
          tableName: "MyGlobalTableRenamed",
          replicationGroup: ["eu-west-1"],
          attributeDefinitions,
          keySchema
        });
      } catch (e) {
        expect(e.message).toEqual(
          "Can't rename Global Table. Use serverless remove to delete 'MyGlobalTable' first."
        );
      }

      expect(mockDynamoDB).toBeCalledTimes(0);
      expect(mockDynamoDBRemove).toBeCalledTimes(0);
      expect(mockUpdateGlobalTable).toBeCalledTimes(0);
    });
  });
});
