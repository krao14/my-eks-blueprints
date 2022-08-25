// lib/pipeline.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import ClusterConstruct from '../lib/my-eks-blueprints-stack';

// import { TeamPlatform, TeamApplication } from '../teams';

export default class PipelineConstruct extends Construct {
  constructor(scope: Construct, id: string, props?: cdk.StackProps){
    super(scope, id)

    const account = props?.env?.account!;
    const region = props?.env?.region!;

    const blueprint = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .addOns(new blueprints.ClusterAutoScalerAddOn);// .teams(new TeamPlatform(account), new TeamApplication('burnham',account));
  
    const repoUrl = 'https://github.com/aws-samples/eks-blueprints-workloads.git';

    const bootstrapRepo : blueprints.ApplicationRepository = {
        repoUrl,
        targetRevision: 'workshop',
    }

    // HERE WE GENERATE THE ADDON CONFIGURATIONS
    const devBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/dev'
        },
    });
    const testBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/test'
        },
    });
    const prodBootstrapArgo = new blueprints.ArgoCDAddOn({
        bootstrapRepo: {
            ...bootstrapRepo,
            path: 'envs/prod'
        },
    });
    
    blueprints.CodePipelineStack.builder()
      .name("eks-blueprints-workshop-pipeline")
      .owner("krao14")
      .repository({
          repoUrl: 'my-eks-blueprints',
          credentialsSecretName: 'github-token',
          targetRevision: 'main'
      })
      .wave({
        id: "envs",
        stages: [
          { id: "dev", stackBuilder: blueprint.clone('us-west-2').addOns(devBootstrapArgo)},
          { id: "test", stackBuilder: blueprint.clone('us-east-2').addOns(testBootstrapArgo)},
          { id: "prod", stackBuilder: blueprint.clone('us-east-1').addOns(prodBootstrapArgo)}
        ]
      })
      .build(scope, id+'-stack', props);
  }
}

const app = new cdk.App();
const account = process.env.CDK_DEFAULT_ACCOUNT!;
const region = process.env.CDK_DEFAULT_REGION;
const env = { account, region }
new ClusterConstruct(app, 'Training', { env });
new ClusterConstruct(app, 'Inference', { env });