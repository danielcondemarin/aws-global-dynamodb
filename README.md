# global-dynamodb-table

Easily provision Global DynamoDB tables using [Serverless Components](https://github.com/serverless/components).

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

&nbsp;

### 1. Install

```shell
$ npm install -g serverless
```

### 2. Create

Just create a `serverless.yml` file

```shell
$ touch serverless.yml
$ touch .env      # your AWS api keys
```

```
# .env
AWS_ACCESS_KEY_ID=XXX
AWS_SECRET_ACCESS_KEY=XXX
```

### 3. Configure

```yml
# serverless.yml

myGlobalTable:
  component: "global-dynamodb-table"
  inputs:
    tableName: nameOfTable
    replicationGroup: ["eu-west-1", "us-west-1"]
    attributeDefinitions:
      - AttributeName: id
        AttributeType: S
    keySchema:
      - AttributeName: id
        KeyType: HASH
```

Your table will be automatically created and replicated through all the regions given in the `replicationGroup`.

### 4. Deploy

```shell
$ serverless
```

&nbsp;

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
