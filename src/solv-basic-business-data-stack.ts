import {Construct} from 'constructs';
import {join} from 'path';
import {NodejsFunction} from 'aws-cdk-lib/aws-lambda-nodejs';
import {Runtime} from 'aws-cdk-lib/aws-lambda';
import * as EC2 from 'aws-cdk-lib/aws-ec2';
import {ISecurityGroup, IVpc, SecurityGroup, SubnetSelection, Vpc} from 'aws-cdk-lib/aws-ec2';
import {Effect, ManagedPolicy, PolicyStatement} from 'aws-cdk-lib/aws-iam';
import {Duration, Stack, StackProps} from 'aws-cdk-lib';
import * as process from 'node:process';

export class SolvBasicBusinessDataStack extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        let vpc: IVpc | undefined;
        let securityGroups: ISecurityGroup[] | undefined;
        let privateSubnets: SubnetSelection = {
            subnets: [],
        };

        if (process.env.CONFIG_ENV !== 'local') {
            vpc = Vpc.fromLookup(this, 'Vpc', {vpcId: process.env.VPC_ID});
            securityGroups = [SecurityGroup.fromLookupById(this, 'Security5`Group', process.env.SECURITY_GROUP_ID!)];

            const subnetIds = process.env.PRIVATE_SUBNETS!.split(',');
            for (let i: number = 0; i < subnetIds.length; i++) {
                const subnet = EC2.Subnet.fromSubnetId(this, subnetIds[i], subnetIds[i]);
                privateSubnets?.subnets?.push(subnet);
            }
        }
        const sharedLambdaEnv = {
            CDK_DEPLOY_REGION: process.env.CDK_DEPLOY_REGION!,
            DB_PROXY_HOSTNAME: process.env.DB_PROXY_HOSTNAME!,
            SECRET_ID: process.env.SECRET_ID!,
            DATABASE_NAME: process.env.DATABASE_NAME!,
            CONFIG_ENV: process.env.CONFIG_ENV!,
            DB_USER_NAME: process.env.DB_USER_NAME!,
            REDIS_URL: process.env.REDIS_URL!,
        };

        const buildFunctionName = (suffix: string) => `${process.env.CONFIG_ENV}-bbd-${suffix}`;
        const createQueryLambda = (
            suffix: string,
            handler: string,
            entryPath: string,
            options: {
                memorySize?: number;
                timeoutSeconds?: number;
                environment?: Record<string, string>;
            } = {}
        ) => {
            const functionName = buildFunctionName(suffix);
            const {
                memorySize = 512,
                timeoutSeconds = 30,
                environment: extraEnv = {},
            } = options;
            return new NodejsFunction(this, functionName, {
                entry: entryPath,
                functionName,
                memorySize,
                timeout: Duration.seconds(timeoutSeconds),
                runtime: Runtime.NODEJS_20_X,
                handler,
                vpc,
                vpcSubnets: privateSubnets,
                securityGroups,
                allowPublicSubnet: true,
                bundling: {
                    commandHooks: {
                        afterBundling(inputDir, outputDir) {
                            return [
                                `cp -r ${inputDir}/config ${outputDir}/config`,
                                `cp -r ${inputDir}/abis ${outputDir}/abis`,
                                `cp -r ${inputDir}/build/handlers ${outputDir}/handlers`
                            ];
                        },
                        beforeBundling() { return []; },
                        beforeInstall() { return []; },
                    }
                },
                environment: {
                    ...sharedLambdaEnv,
                    ...extraEnv,
                    HANDLERS_DIR: join(__dirname, './handlers'),
                },
            });
        };

        const runtimeLambdas = [];

        const routerEventEntry = join(__dirname, './lambda/RouterEvent.ts');
        const routerEventByIds = createQueryLambda('routeEventByIds-handler', 'routeByIds', routerEventEntry);
        const routerEventByConfig = createQueryLambda('routeEventByConfig-handler', 'routeByConfig', routerEventEntry);
        runtimeLambdas.push(routerEventByIds, routerEventByConfig);

        if (process.env.CONFIG_ENV !== 'local') {
            const runtimeManagedPolicy = new ManagedPolicy(this, 'OpenDataServiceRuntimePolicy', {
                managedPolicyName: `${process.env.CONFIG_ENV}-basic-business-data-runtime`,
                statements: [
                    new PolicyStatement({
                        effect: Effect.ALLOW,
                        actions: [
                            's3:GetObject',
                            's3:PutObject',
                            'kms:Decrypt',
                            'secretsmanager:GetSecretValue',
                            'rds-db:connect',
                            'lambda:InvokeFunction',
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents',
                            'ec2:CreateNetworkInterface',
                            'ec2:DescribeNetworkInterfaces',
                            'ec2:DeleteNetworkInterface',
                            'ec2:AssignPrivateIpAddresses',
                            'ec2:UnassignPrivateIpAddresses',
                            'sqs:DeleteMessage',
                            'sqs:GetQueueAttributes',
                            'sqs:ReceiveMessage',
                            'sqs:SendMessage',
                            'sns:Publish',
                        ],
                        resources: ['*'],
                    }),
                ],
            });

            // Attach managed policy to all runtime Lambda functions (webhook, consumers, queries)

            runtimeLambdas.forEach(lambda => lambda.role?.addManagedPolicy(runtimeManagedPolicy));

        }

        if (process.env.CONFIG_ENV == 'prod') {
        }

        // Create REST API
        // const restApiName = process.env.CONFIG_ENV + '-basic-business-data-api';
        // const restApi = new RestApi(this, restApiName, {
        //     restApiName: restApiName,
        //     deployOptions: {
        //         stageName: process.env.CONFIG_ENV,
        //     },
        // });

        // // API v1 resource group for public query endpoints
        // const apiResource = restApi.root.addResource('api');
    }

    public static async build(scope: Construct, id: string): Promise<SolvBasicBusinessDataStack> {
        return new SolvBasicBusinessDataStack(scope, id);
    }
}

export class SolvBasicBusinessDataStackInstance extends Stack {
    // constructor(scope: Construct, id: string, props?: StackProps & { authorizerFunctionArn?: string }) {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);
        SolvBasicBusinessDataStack.build(this, 'solv-basic-business-data');
    }
}
