const { Component } = require("@serverless/core");
const { equals, difference } = require("ramda");
const AWS = require("aws-sdk");
const {
  createGlobalTable,
  updateGlobalTable,
  getDeployedRegions
} = require("./utils");

class GlobalDynamoDBTableComponent extends Component {
  get client() {
    return new AWS.DynamoDB({
      credentials: this.context.credentials.aws
    });
  }

  createTableInRegions(
    globalTableName,
    regions,
    attributeDefinitions,
    keySchema
  ) {
    const createTables = regions.map(async region => {
      const dynamodb = await this.load(
        "@serverless/aws-dynamodb",
        `${globalTableName}_${region}`
      );

      return dynamodb({
        name: globalTableName,
        region,
        attributeDefinitions: attributeDefinitions,
        keySchema: keySchema
      });
    });

    return Promise.all(createTables);
  }

  deleteTableFromRegions(globalTableName, regions) {
    const deleteTables = regions.map(async region => {
      const dynamodb = await this.load(
        "@serverless/aws-dynamodb",
        `${globalTableName}_${region}`
      );

      return dynamodb.remove();
    });

    return Promise.all(deleteTables);
  }

  async default(inputs = {}) {
    const inputRegions = inputs.replicationGroup.sort();
    const tableName = inputs.tableName;

    let deployedRegions = [];
    let globalTableDoesNotExist = false;

    try {
      deployedRegions = await getDeployedRegions(this.client, tableName);
    } catch (err) {
      globalTableDoesNotExist = true;
    }

    if (equals(deployedRegions, inputRegions)) {
      return;
    }

    const addRegions = difference(inputRegions, deployedRegions);
    const deleteRegions = difference(deployedRegions, inputRegions);

    await this.createTableInRegions(
      tableName,
      addRegions,
      inputs.attributeDefinitions,
      inputs.keySchema
    );
    await this.deleteTableFromRegions(tableName, deleteRegions);

    if (globalTableDoesNotExist) {
      return createGlobalTable(this.client, tableName, inputRegions);
    } else {
      await updateGlobalTable(
        this.client,
        tableName,
        addRegions,
        deleteRegions
      );
    }

    this.state.tableName = tableName;

    await this.save();
  }

  async remove() {
    const tableName = this.state.tableName;
    const regions = await getDeployedRegions(this.client, tableName);

    await this.deleteTableFromRegions(tableName, regions);
  }
}

module.exports = GlobalDynamoDBTableComponent;
