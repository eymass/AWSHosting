import {ACM} from '@aws-sdk/client-acm';
import consts, {region} from '../consts.js';
import {Route53} from '@aws-sdk/client-route-53';
import {GetHostedZoneId} from '../route/route.service.js';
import {sleep} from '../utils.js';

const ValidateCertificate = async ({ CertificateArn, DomainName }) => {
  //= ============
  let message = '[ValidateCertificate] DNS Validating for ' + DomainName + '...';
  console.log(message);
  //= ============
  const acmClient = new ACM({ region: consts.region });
  const describe = await acmClient.describeCertificate({ CertificateArn });
  const { DomainValidationOptions } = describe.Certificate;
  message = '[ValidateCertificate] DomainValidationOptions: ' + JSON.stringify(DomainValidationOptions);
  console.log(message);
  const CHANGES = [];
  for (let i = 0; i < DomainValidationOptions.length; i++) {
    const currentDomain = DomainValidationOptions[i];
    const { ResourceRecord } = currentDomain;
    CHANGES.push({
      Action: 'CREATE',
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
  message = '[ValidateCertificate] Changes constructed!';
  console.log(message);
  const routeClient = new Route53({ region: consts.region });
  const HostedZoneId = await GetHostedZoneId({ DomainName })
  message = '[ValidateCertificate] HostedZoneId: ' + HostedZoneId;
  console.log(message);
  const ChangeBatch = { Changes: CHANGES, Comment: '' };
  message = '[ValidateCertificate] HostedZoneId: ' + HostedZoneId;
  console.log(message);
  message = '[ValidateCertificate] Adding records to Route53... Batch: ' + JSON.stringify(ChangeBatch);
  console.log(message);
  await routeClient.changeResourceRecordSets({ HostedZoneId, ChangeBatch });
  message = '[ValidateCertificate] Records Added!';
  console.log(message);
  return HostedZoneId;
};

export const RequestCertificate = async ({ DomainName }) => {
  //= ============
  let message = '[RequestCertificate] Requesting cert for ' + DomainName + '...';
  console.log(message);
  //= ============
  const SubjectAlternativeNames = ['www.' + DomainName];
  const acmClient = new ACM({ region: 'us-east-1' });
  const cert = await acmClient.requestCertificate({
    DomainName,
    ValidationMethod: 'DNS',
    SubjectAlternativeNames,
    IdempotencyToken: '12563'
  });
  await sleep(consts.SLEEP_MS);
  const HostedZoneId = await ValidateCertificate({ CertificateArn: cert.CertificateArn, DomainName, SubjectAlternativeNames });
  await sleep(consts.SLEEP_MS_LONG);
  //= ============
  message = '[RequestCertificate] acmClient response: ' + JSON.stringify(cert);
  console.log(message);
  //= ============
  return { Arn: cert.CertificateArn, HostedZoneId };
};

export const IsCertificateIssued = async ({ Arn }) => {
  //= ============
  let message = '[IsCertificateIssued] Checking is issued for ' + Arn + '...';
  console.log(message);
  //= ============
  const acmClient = new ACM({ region });
  const cert = await acmClient.describeCertificate({CertificateArn: Arn});
  return cert && cert.Certificate && cert.Certificate.Status === "ISSUED"
};
