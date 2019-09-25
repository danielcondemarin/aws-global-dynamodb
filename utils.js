module.exports = {
  createGlobalTable: async (client, tableName, regions) => {
    const {
      GlobalTableDescription: { GlobalTableName, GlobalTableArn }
    } = await client
      .createGlobalTable({
        GlobalTableName: tableName,
        ReplicationGroup: regions.map(r => ({
          RegionName: r
        }))
      })
      .promise();
    return { GlobalTableName, GlobalTableArn };
  },

  updateGlobalTable: async (client, tableName, addRegions, deleteRegions) => {
    const addReplicas = addRegions.map(r => ({ Create: { RegionName: r } }));
    const deleteReplicas = deleteRegions.map(r => ({
      Delete: { RegionName: r }
    }));

    return client
      .updateGlobalTable({
        GlobalTableName: tableName,
        ReplicaUpdates: [...addReplicas, ...deleteReplicas]
      })
      .promise();
  },

  getDeployedRegions: async (client, tableName) => {
    const { GlobalTableDescription } = await client
      .describeGlobalTable({
        GlobalTableName: tableName
      })
      .promise();

    return GlobalTableDescription.ReplicationGroup.map(
      rg => rg.RegionName
    ).sort();
  }
};
