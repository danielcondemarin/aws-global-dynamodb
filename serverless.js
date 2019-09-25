const { Component } = require("@serverless/core");
const { equals, difference } = require("ramda");
const AWS = require("aws-sdk");

class GlobalDynamoDBTableComponent extends Component {
  get client() {
    return new AWS.DynamoDB({
      credentials: this.context.credentials.aws
    });
  }

  async default(inputs = {}) {
    const inputRegions = inputs.replicationGroup.sort();
    const tableName = inputs.tableName;

    let regionsCurrentlyDeployed = [];
    let globalTableDoesNotExist = false;

    try {
      const { GlobalTableDescription } = await this.client
        .describeGlobalTable({
          GlobalTableName: tableName
        })
        .promise();

      regionsCurrentlyDeployed = GlobalTableDescription.ReplicationGroup.map(
        rg => rg.RegionName
      ).sort();
    } catch (err) {
      globalTableDoesNotExist = true;
    }

    if (equals(regionsCurrentlyDeployed, inputRegions)) {
      return;
    }

    const addRegions = difference(inputRegions, regionsCurrentlyDeployed);
    const deleteRegions = difference(regionsCurrentlyDeployed, inputRegions);

    const createTableTasks = addRegions.map(async region => {
      const dynamodb = await this.load(
        "@serverless/aws-dynamodb",
        `${inputs.tableName}_${region}`
      );

      return dynamodb({
        name: inputs.tableName,
        region,
        attributeDefinitions: inputs.attributeDefinitions,
        keySchema: inputs.keySchema
      });
    });

    await Promise.all(createTableTasks);

    if (globalTableDoesNotExist) {
      const {
        GlobalTableDescription: { GlobalTableName, GlobalTableArn }
      } = await this.client
        .createGlobalTable({
          GlobalTableName: inputs.tableName,
          ReplicationGroup: inputRegions.map(r => ({
            RegionName: r
          }))
        })
        .promise();

      return { GlobalTableName, GlobalTableArn };
    } else {
      const addReplicas = addRegions.map(r => ({ Create: { RegionName: r } }));
      const deleteReplicas = deleteRegions.map(r => ({
        Delete: { RegionName: r }
      }));

      await this.client
        .updateGlobalTable({
          GlobalTableName: tableName,
          ReplicaUpdates: [...addReplicas, ...deleteReplicas]
        })
        .promise();
    }

    this.state.tableName = tableName;

    await this.save();
  }

  async remove() {
    const tableName = this.state.tableName;

    const { GlobalTableDescription } = await this.client
      .describeGlobalTable({
        GlobalTableName: tableName
      })
      .promise();

    const regions = GlobalTableDescription.ReplicationGroup.map(
      rg => rg.RegionName
    );

    await Promise.all(
      regions.map(async region => {
        const dynamodb = await this.load(
          "@serverless/aws-dynamodb",
          `${tableName}_${region}`
        );
        return dynamodb.remove();
      })
    );
  }
}

module.exports = GlobalDynamoDBTableComponent;
