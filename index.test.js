import {Deploy} from './index';

const TEST1 = {
  DomainName: 'twasulna25.com',
  S3BucketName: 'test-bucket.com',
  PreCertificateArn: ''
}

describe('test host new website', () => {
  it('host success', async () => {
    const result = await Deploy({
      DomainName: TEST1.DomainName,
      S3BucketName: TEST1.S3BucketName,
      PreCertificateArn: TEST1.PreCertificateArn
    });

    expect(result.err).toBe(undefined)
  })
});
