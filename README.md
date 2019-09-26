# AWS Global DynamoDB

Provision Global DynamoDB Tables in a few lines. Simply provide a list of regions where you want your table to be replicated and the component handles the rest :sparkles:. You can also add or remove regions at any time.

Powered by [Serverless Components](https://github.com/serverless/components) :zap:

# Contents

- [Install](#1-install)
- [Create](#2-create)
- [Configure](#3-configure)
- [Deploy](#4-deploy)

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
  component: "aws-global-dynamodb"
  inputs:
    tableName: myGlobalTable
    replicationGroup: ["eu-west-1", "us-west-1"]
    attributeDefinitions:
      - AttributeName: id
        AttributeType: S
    keySchema:
      - AttributeName: id
        KeyType: HASH
```

### 4. Deploy

```shell
$ serverless
```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
