import {ACM} from '@aws-sdk/client-acm';
import {CloudFront} from '@aws-sdk/client-cloudfront';
import {Route53} from '@aws-sdk/client-route-53';
const prompt = require('prompt');

const region = 'us-east-1';
const SLEEP_MS = 10000;
const SLEEP_MS_LONG = 20000;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const ValidateCertificate = async ({ CertificateArn, DomainName }) => {
  //=============
  let message = "[ValidateCertificate] DNS Validating for " + DomainName + "...";
  console.log(message);
  //=============
  const acmClient = new ACM({ region });
  const describe = await acmClient.describeCertificate({ CertificateArn });
  const { DomainValidationOptions } = describe.Certificate;
  message = "[ValidateCertificate] DomainValidationOptions: " + JSON.stringify(DomainValidationOptions);
  console.log(message);
  const CHANGES = [];
  for (let i = 0; i < DomainValidationOptions.length; i++) {
    const currentDomain = DomainValidationOptions[i];
    const { ResourceRecord } = currentDomain;
    CHANGES.push({
      Action: "CREATE",
      ResourceRecordSet: {
        Name: ResourceRecord.Name,
        ResourceRecords: [
          {
            Value: ResourceRecord.Value
          }
        ],
        TTL: 66000,
        Type: ResourceRecord.Type
      }
    });
  }
  message = "[ValidateCertificate] Changes constructed!";
  console.log(message);
  const routeClient = new Route53({ region });
  const idResult = await routeClient.listHostedZonesByName({ DNSName: DomainName, MaxItems: 1 });
  message = "[ValidateCertificate] listHostedZonesByName result: " + JSON.stringify(idResult);
  console.log(message);
  const HostedZoneId = idResult.HostedZones[0].Id.split("/")[2];
  message = "[ValidateCertificate] HostedZoneId: " + HostedZoneId;
  console.log(message);
  const ChangeBatch = { Changes: CHANGES, Comment: "" };
  message = "[ValidateCertificate] HostedZoneId: " + HostedZoneId;
  console.log(message);
  message = "[ValidateCertificate] Adding records to Route53... Batch: " + JSON.stringify(ChangeBatch);
  console.log(message);
  const routeResult = await routeClient.changeResourceRecordSets({ HostedZoneId, ChangeBatch });
  message = "[ValidateCertificate] Records Added!";
  console.log(message);
  return HostedZoneId;
};

export const AddRouteARecords = async ({ HostedZoneId, DomainName, DistributionDomainName }) => {
  const routeClient = new Route53({ region });
  const CHANGES = [
    {
      Action: "CREATE",
      ResourceRecordSet: {
        Name: DomainName,
        Type: "A",
        AliasTarget: {
          DNSName: DistributionDomainName,
          EvaluateTargetHealth: false,
          HostedZoneId: "Z2FDTNDATAQYW2"
        },
      }
    },
    {
      Action: "CREATE",
      ResourceRecordSet: {
        Name: "www." + DomainName,
        Type: "A",
        AliasTarget: {
          DNSName: DistributionDomainName,
          EvaluateTargetHealth: false,
          HostedZoneId: "Z2FDTNDATAQYW2"
        },
      }
    }
  ];
  let message = "[AddRouteRecords] HostedZoneId: " + HostedZoneId;
  console.log(message);
  const ChangeBatch = { Changes: CHANGES };
  message = "[AddRouteRecords] HostedZoneId: " + HostedZoneId;
  console.log(message);
  message = "[AddRouteRecords] Adding records to Route53... Batch: " + JSON.stringify(ChangeBatch);
  console.log(message);
  const routeResult = await routeClient.changeResourceRecordSets({ HostedZoneId, ChangeBatch });
  message = "[AddRouteRecords] Records Added!";
};

export const RequestCertificate = async ({ DomainName }) => {
  //=============
  let message = "[RequestCertificate] Requesting cert for " + DomainName + "...";
  console.log(message);
  //=============
  const SubjectAlternativeNames = ['www.' + DomainName];
  const acmClient = new ACM({ region });
  const cert = await acmClient.requestCertificate({
    DomainName,
    ValidationMethod: "DNS",
    SubjectAlternativeNames,
    IdempotencyToken: '12563'
  });
  await sleep(SLEEP_MS);
  const HostedZoneId = await ValidateCertificate({ CertificateArn: cert.CertificateArn, DomainName, SubjectAlternativeNames });
  await sleep(SLEEP_MS_LONG);
  //=============
  message = "[RequestCertificate] acmClient response: "+ JSON.stringify(cert);
  console.log(message);
  //=============
  return { cert, HostedZoneId };
};

export const CreateDistribution = async ({ DomainName, S3BucketName, CertificateArn }) => {
  let message = "[CreateDistribution] Starting distribution for " + DomainName + " from Origin: " + S3BucketName + "...";
  console.log(message);
  const cloudClient = new CloudFront({ region });
  const DistributionConfig = GetDistributionConfig({ DomainName, S3BucketName, CertificateArn });
  message = "[CreateDistribution] DistributionConfig created!";
  console.log(message);
  const distributionResponse = await cloudClient.createDistribution({ DistributionConfig });
  message = "[CreateDistribution] cloudClient response: "+ JSON.stringify(distributionResponse);
  console.log(message);
  return distributionResponse;
};

const GetDistributionConfig = ({ DomainName, S3BucketName, CertificateArn }) => {
  return {
    CallerReference: Date.now() + "",
    Aliases: {
      "Quantity": 2,
      "Items": [
        DomainName,
        "www."+DomainName
      ]
    },
    DefaultRootObject: "index.html",
    Origins: {
      "Quantity": 1,
      "Items": [
        {
          "Id": "S3-" + S3BucketName,
          "DomainName": S3BucketName + ".s3.amazonaws.com",
          "OriginPath": "",
          "CustomHeaders": {
            "Quantity": 0
          },
          "S3OriginConfig": {
            "OriginAccessIdentity": ""
          },
          "ConnectionAttempts": 3,
          "ConnectionTimeout": 10
        }
      ]
    },
    OriginGroups: {
      "Quantity": 0
    },
    DefaultCacheBehavior: {
      "TargetOriginId": "S3-" + S3BucketName,
      "TrustedSigners": {
        "Enabled": false,
        "Quantity": 0
      },
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {
        "Quantity": 2,
        "Items": [
          "HEAD",
          "GET"
        ],
        "CachedMethods": {
          "Quantity": 2,
          "Items": [
            "HEAD",
            "GET"
          ]
        }
      },
      "SmoothStreaming": false,
      "Compress": true,
      "LambdaFunctionAssociations": {
        "Quantity": 0
      },
      "FieldLevelEncryptionId": "",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
    },
    CacheBehaviors: {
      "Quantity": 0
    },
    CustomErrorResponses: {
      "Quantity": 0
    },
    Comment: "",
    Logging: {
      "Enabled": false,
      "IncludeCookies": false,
      "Bucket": "",
      "Prefix": ""
    },
    PriceClass: "PriceClass_All",
    Enabled: true,
    ViewerCertificate: {
      "ACMCertificateArn": CertificateArn,
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2019",
      "Certificate": CertificateArn,
      "CertificateSource": "acm"
    },
    "Restrictions": {
      "GeoRestriction": {
        "RestrictionType": "none",
        "Quantity": 0
      }
    },
    WebACLId: "",
    HttpVersion: "http2",
    IsIPV6Enabled: true
  };
}

export const Deploy = async ({ DomainName, S3BucketName, PreCertificateArn }) => {
  let message = "[Deploy] Deploying " + DomainName + " from Origin: " + S3BucketName + "...";
  console.log(message);
  let CertificateArn = PreCertificateArn;
  let _HostedZoneId = "";

  if (typeof CertificateArn === 'undefined' || CertificateArn === "" || CertificateArn === null) {
    const { cert, HostedZoneId } = await RequestCertificate({ DomainName });
    _HostedZoneId = HostedZoneId;
    await sleep(SLEEP_MS);
    CertificateArn = cert.CertificateArn;
  }

  const distribution = await CreateDistribution({ DomainName, S3BucketName, CertificateArn });
  message = "[Deploy] Distribution result " + JSON.stringify(distribution);
  console.log(message);
  const DistributionDomainName = distribution.Distribution.DomainName;
  message = "[Deploy] Distribution domain name: " + DistributionDomainName;
  console.log(message);

  message = "[Deploy] Adding Route A Records... ";
  console.log(message);
  await AddRouteARecords({ HostedZoneId: _HostedZoneId, DomainName, DistributionDomainName });
};

(async function() {
  prompt.start();

  prompt.get(['DomainName', 'S3BucketName'], function (err, result) {
    console.log('Command-line input received:');
    console.log('  DomainName: ' + result.DomainName);
    console.log('  S3BucketName: ' + result.S3BucketName);
    console.log('Are you sure you want to deploy domain: '+result.DomainName+ ' origin ' +result.S3BucketName + " ?");
    const DomainName = result.DomainName;
    const S3BucketName = result.S3BucketName;
    prompt.get(['YesNo'], function (err, result) {
      console.log('  YesNo: ' + result.YesNo);
      if (result.YesNo.toLowerCase() === 'y') {
        Deploy({
          DomainName: DomainName,
          S3BucketName: S3BucketName
        });
      }
    });
  });


})();
