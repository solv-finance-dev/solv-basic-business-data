#!/usr/bin/env node
import * as dotenv from 'dotenv';
import {App} from 'aws-cdk-lib';
import {resolve} from 'path';
import {SolvBasicBusinessDataStackInstance} from '../src/solv-basic-business-data-stack';

const app = new App();
const envType = app.node.tryGetContext('config');
const envFile = resolve(`${process.cwd()}/config/`, envType ? `.env.${envType}` : '.env.dev');
dotenv.config({path: envFile});

console.log('Current Region:', process.env.CDK_DEPLOY_REGION);

const stackEnv = {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};

// Deploy main stack with reference to authorizer function
new SolvBasicBusinessDataStackInstance(app, envType + '-SolvBasicBusinessDataStack', {
    env: stackEnv
});
