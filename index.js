import consts from './consts.js';
import {IsCertificateIssued, RequestCertificate} from './acm/acm.service.js';
import {CreateDistribution} from './cloudfront/distribution.config.js';
import {sleep} from './utils.js';
import {AddRouteARecords, GetHostedZoneId, IsHostedZoneReady} from './route/route.service.js';
import logger from './logger.js';

const isRequestCert = CertificateArn => typeof CertificateArn === 'undefined' || CertificateArn === '' || CertificateArn === null;
const isOriginProvided = S3BucketName => typeof S3BucketName !== 'undefined' && S3BucketName !== '' && S3BucketName !== null;

export const Deploy = async ({ DomainName, S3BucketName, PreCertificateArn }) => {
  const log = logger.child({scope: '[Deploy]'});
  log.info(`Deploying ${DomainName}, Origin: ${S3BucketName}...`);
  const dmnReady = await IsHostedZoneReady({DomainName});
  if (!dmnReady) {
    log.info(`[Deploy] Hosted zone for ${DomainName} is not ready`);
    return;
  }

  try {
    let {HostedZoneId, CertificateArn} = RequestCertificate({DomainName, PreCertificateArn});
    if (isOriginProvided(S3BucketName)) {
      const distribution = await CreateDistribution({DomainName, S3BucketName, CertificateArn});
      log.info(`Distribution created: ${distribution.Distribution.DomainName}`);
      log.info(`Adding route records for ${DomainName}...`);
      await AddRouteARecords({HostedZoneId, DomainName, DistributionDomainName});
    }
  } catch (e) {
    log.error(`[Deploy] error: ${e}`);
  }
};

const RequestCertificate = async ({ DomainName, PreCertificateArn }) => {
  const log = logger.child({scope: '[RequestCertificate]'});
  let _HostedZoneId;
  let _CertificateArn = PreCertificateArn;
  try {
    if (isRequestCert(_CertificateArn)) {
      const { Arn, HostedZoneId } = await RequestCertificate({ DomainName });
      _CertificateArn = Arn
      _HostedZoneId = HostedZoneId;
      await sleep(consts.SLEEP_CERT_MS);
    } else {
      _HostedZoneId = await GetHostedZoneId({ DomainName })
    }
    const isIssued = await IsCertificateIssued({Arn: _CertificateArn})
    if (!isIssued) {
      log.error(`[RequestCertificate] certificate is not issued`)
      throw new Error(`certificate is not issued yet, after waiting ${consts.SLEEP_CERT_MS} seconds`)
    }
  } catch (e) {
    log.error(`[RequestCertificate] error: ${e}`)
  }
  return {HostedZoneId: _HostedZoneId, CertificateArn: _CertificateArn};
}
