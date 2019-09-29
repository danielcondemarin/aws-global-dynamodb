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
      credentials: this.context.credentials.aws,
      // any region here works
      region: "eu-west-1"
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

      this.context.debug(`Creating new table in region ${region}`);

      return dynamodb({
        name: globalTableName,
        region,
        attributeDefinitions: attributeDefinitions,
        keySchema: keySchema,
        stream: true
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

      this.context.debug(`Deleting table from region ${region}`);

      return dynamodb.remove();
    });

    return Promise.all(deleteTables);
  }

  validateInputs(inputs) {
    const inputTableName = inputs.tableName;
    const stateTableName = this.state.tableName;

    if (stateTableName) {
      if (inputTableName !== stateTableName) {
        throw new Error(
          `Can't rename Global Table. Use serverless remove to delete '${stateTableName}' first.`
        );
      }
    }
  }

  async default(inputs = {}) {
    const inputRegions = inputs.replicationGroup.sort();
    const inputTableName = inputs.tableName;

    this.validateInputs(inputs);

    let deployedRegions = [];
    let globalTableDoesNotExist = false;

    try {
      deployedRegions = await getDeployedRegions(this.client, inputTableName);
      this.context.debug("Global table provisioned.");
    } catch (err) {
      this.context.debug("Global table not provisioned.");
      globalTableDoesNotExist = true;
    }

    if (equals(deployedRegions, inputRegions)) {
      return;
    }

    const addRegions = difference(inputRegions, deployedRegions);
    const deleteRegions = difference(deployedRegions, inputRegions);

    await this.createTableInRegions(
      inputTableName,
      addRegions,
      inputs.attributeDefinitions,
      inputs.keySchema
    );

    await this.deleteTableFromRegions(inputTableName, deleteRegions);

    if (globalTableDoesNotExist) {
      await createGlobalTable(this.client, inputTableName, inputRegions);
    } else {
      await updateGlobalTable(
        this.client,
        inputTableName,
        addRegions,
        deleteRegions
      );
    }

    this.state.tableName = inputTableName;

    await this.save();
  }

  async remove() {
    const tableName = this.state.tableName;
    console.log("TCL: remove -> tableName", tableName);

    if (!tableName) {
      this.context.debug("Table name not found in state. Aborting!");
      return;
    }

    const regions = await getDeployedRegions(this.client, tableName);

    await this.deleteTableFromRegions(tableName, regions);
  }
}

module.exports = GlobalDynamoDBTableComponent;
