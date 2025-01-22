import Homey from 'homey';
import fetch from 'http.min';
import { ExternalMeterStatus } from '../../types/external-meter-status';
import {configUrl, meterInfoUrl} from './device-const';

class MyDriver extends Homey.Driver {
  private static LOAD_BALANCE_TYPE_LOCAL = 'EXTERNAL';
  private static LOAD_BALANCE_TYPE_GROUP = 'CENTRAL100';

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('GNM3D-RS485 has been initialized');
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    console.log("Pairing started");
    return [];
  }

  async onPair(session: any) {
    await session.showView("configure_ip");

    session.setHandler("configure_ip", async (data: any) => {
      this.log('backend configure_ip, ip: ', data.settings.host);

      const config: any = await this.fetchConfig(data);
      this.setLoadBalanceType(config, data);

      let result: { data: ExternalMeterStatus };
      try {
        const options = {
          timeout: 4000,
          json: true,
          protocol: 'http:',
          hostname: data.settings.host,
          port: 8080,
          path: `/${this.getMeterInfoUrl(data)}${(new Date()).getTime()}`,
          headers: {
            'User-Agent': 'Homey'
          }
        };
        result = await fetch(options);
      } catch (e: any) {
        this.error('No response from a Garo charger on this IP address', e.message);
        throw new Error('No response from a Garo charger on this IP address');
      }

      this.log('result.data', result.data);
      if (!result?.data?.meterSerial) {
        throw new Error('The device on this IP address does not appear to be a Garo smart meter.');
      }
      return {
        ...data,
        data: {
          id: result.data.meterSerial,
        }
      };
    });

    // Received when a view has changed
    session.setHandler("showView", async function (viewId: string) {
      console.log("View: " + viewId);
    });
  }

  private getMeterInfoUrl(data: any) {
    return `${meterInfoUrl}${data.settings.loadBalanceType}?_=`;
  }

  private async fetchConfig(data: any) {
    try {
      const options = {
        timeout: 4000,
        json: true,
        protocol: 'http:',
        hostname: data.settings.host,
        port: 8080,
        path: `/${configUrl}${(new Date()).getTime()}`,
        headers: {
          'User-Agent': 'Homey'
        }
      };
      const result = await fetch(options);
      return result.data;
    } catch (e: any) {
      this.error('No response from a Garo charger on this IP address for fetching config', e.message);
      throw new Error('No response from a Garo charger on this IP address for fetching config');
    }
  }

  private setLoadBalanceType(config: any, data: any) {
    if (config.localLoadBalanced) {
      data.settings.loadBalanceType = MyDriver.LOAD_BALANCE_TYPE_LOCAL;
    } else if (config.groupLoadBalanced) {
      data.settings.loadBalanceType = MyDriver.LOAD_BALANCE_TYPE_GROUP;
    } else {
      throw new Error('Failed to set load balance type.');
    }
  }
}

module.exports = MyDriver;
