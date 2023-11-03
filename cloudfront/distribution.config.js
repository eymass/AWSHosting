import {CloudFront} from '@aws-sdk/client-cloudfront';
import {region} from '../consts.js';

export const GetDistributionConfig = ({ DomainName, S3BucketName, CertificateArn }) => {
  return {
    CallerReference: Date.now() + '',
    Aliases: {
      'Quantity': 2,
      'Items': [
        DomainName,
        'www.' + DomainName
      ]
    },
    DefaultRootObject: 'index.html',
    Origins: {
      'Quantity': 1,
      'Items': [
        {
          'Id': 'S3-' + S3BucketName,
          'DomainName': S3BucketName + '.s3.amazonaws.com',
          'OriginPath': '',
          'CustomHeaders': {
            'Quantity': 0
          },
          'S3OriginConfig': {
            'OriginAccessIdentity': ''
          },
          'ConnectionAttempts': 3,
          'ConnectionTimeout': 10
        }
      ]
    },
    OriginGroups: {
      'Quantity': 0
    },
    DefaultCacheBehavior: {
      'TargetOriginId': 'S3-' + S3BucketName,
      'TrustedSigners': {
        'Enabled': false,
        'Quantity': 0
      },
      'ViewerProtocolPolicy': 'redirect-to-https',
      'AllowedMethods': {
        'Quantity': 2,
        'Items': [
          'HEAD',
          'GET'
        ],
        'CachedMethods': {
          'Quantity': 2,
          'Items': [
            'HEAD',
            'GET'
          ]
        }
      },
      'SmoothStreaming': false,
      'Compress': true,
      'LambdaFunctionAssociations': {
        'Quantity': 0
      },
      'FieldLevelEncryptionId': '',
      'CachePolicyId': '658327ea-f89d-4fab-a63d-7e88639e58f6'
    },
    CacheBehaviors: {
      'Quantity': 0
    },
    CustomErrorResponses: {
      'Quantity': 0
    },
    Comment: '',
    Logging: {
      'Enabled': false,
      'IncludeCookies': false,
      'Bucket': '',
      'Prefix': ''
    },
    PriceClass: 'PriceClass_All',
    Enabled: true,
    ViewerCertificate: {
      'ACMCertificateArn': CertificateArn,
      'SSLSupportMethod': 'sni-only',
      'MinimumProtocolVersion': 'TLSv1.2_2019',
      'Certificate': CertificateArn,
      'CertificateSource': 'acm'
    },
    'Restrictions': {
      'GeoRestriction': {
        'RestrictionType': 'none',
        'Quantity': 0
      }
    },
    WebACLId: '',
    HttpVersion: 'http2',
    IsIPV6Enabled: true
  };
}

export const CreateDistribution = async ({ DomainName, S3BucketName, CertificateArn }) => {
  let message = '[CreateDistribution] Starting distribution for ' + DomainName + ' from Origin: ' + S3BucketName + '...';
  console.log(message);
  const cloudClient = new CloudFront({ region });
  const DistributionConfig = GetDistributionConfig({ DomainName, S3BucketName, CertificateArn });
  message = '[CreateDistribution] DistributionConfig created!';
  console.log(message);
  const distributionResponse = await cloudClient.createDistribution({ DistributionConfig });
  message = '[CreateDistribution] cloudClient response: ' + JSON.stringify(distributionResponse);
  console.log(message);
  return distributionResponse;
};
