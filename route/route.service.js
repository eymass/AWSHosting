import {Route53} from '@aws-sdk/client-route-53';
import consts from '../consts.js';

export const GetHostedZoneId = async ({ DomainName }) => {
  const routeClient = new Route53({ region: consts.region });
  const idResult = await routeClient.listHostedZonesByName({ DNSName: DomainName, MaxItems: 1 });
  const message = '[ValidateCertificate] listHostedZonesByName result: ' + JSON.stringify(idResult);
  console.log(message);
  return idResult.HostedZones[0].Id.split('/')[2];
}

export const AddRouteARecords = async ({ HostedZoneId, DomainName, DistributionDomainName }) => {
  const routeClient = new Route53({ region: consts.region });
  const CHANGES = [
    {
      Action: 'CREATE',
      ResourceRecordSet: {
        Name: DomainName,
        Type: 'A',
        AliasTarget: {
          DNSName: DistributionDomainName,
          EvaluateTargetHealth: false,
          HostedZoneId: 'Z2FDTNDATAQYW2'
        }
      }
    },
    {
      Action: 'CREATE',
      ResourceRecordSet: {
        Name: 'www.' + DomainName,
        Type: 'A',
        AliasTarget: {
          DNSName: DistributionDomainName,
          EvaluateTargetHealth: false,
          HostedZoneId: 'Z2FDTNDATAQYW2'
        }
      }
    }
  ];
  let message = '[AddRouteRecords] HostedZoneId: ' + HostedZoneId;
  console.log(message);
  const ChangeBatch = { Changes: CHANGES };
  message = '[AddRouteRecords] HostedZoneId: ' + HostedZoneId;
  console.log(message);
  message = '[AddRouteRecords] Adding records to Route53... Batch: ' + JSON.stringify(ChangeBatch);
  console.log(message);
  await routeClient.changeResourceRecordSets({ HostedZoneId, ChangeBatch });
  message = '[AddRouteRecords] Records Added!';
};

export const IsHostedZoneReady = async ({ DomainName }) => {
  if (!DomainName || DomainName === '') {
    return false;
  }
  const routeClient = new Route53({ region: consts.region });
  let message = '[IsDomainReady] checking domain: ' + DomainName;
  console.log(message);
  const zones = await routeClient.listHostedZonesByName({DNSName: DomainName, MaxItems: 1});
  if (zones && zones.HostedZones.length > 0) {
    return zones.HostedZones[0].Name.toUpperCase() === DomainName.toLowerCase();
  }
  return false;
};
