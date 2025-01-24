import Homey from 'homey';
import fetch from "http.min";
import { ExternalMeterStatus } from '../../types/external-meter-status';
import {meterInfoUrl} from './device-const';

class SmartMeterDevice extends Homey.Device {
  currentStatus?: ExternalMeterStatus;
  statusInterval?: NodeJS.Timeout;
  meterInterval?: NodeJS.Timeout;
  address?: string;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('Energy meter GNM3D-RS485 has been initialized');
    this.address = this.getSetting("host");

    // Start polling now that all capabilities are set up
    this.meterInterval = this.homey.setInterval(() => {
      this.poll();
    }, 10000);
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('Energy meter GNM3D-RS485 has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   */
  async onSettings(event: any): Promise<string|void> {
    this.log('Energy meter GNM3D-RS485 settings where changed');
    const { newSettings } = event;
    this.address = newSettings.address;
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    this.log('Energy meter GNM3D-RS485 was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('Energy meter GNM3D-RS485 has been deleted');
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
    }
  }

  onDiscoveryResult(discoveryResult: any) {
    // Return a truthy value here if the discovery result matches your device.
    this.log("onDiscoveryResult", discoveryResult);
    return discoveryResult.id === this.getData().id;
  }

  async onDiscoveryAvailable(discoveryResult: any) {
    // This method will be executed once when the device has been found (onDiscoveryResult returned true)
    this.log("onDiscoveryAvailable", discoveryResult);
  }

  async poll() {
    try {
      const result: ExternalMeterStatus = await fetch.json(
        `http://${this.address}:8080/${this.getMeterInfoUrl()}${new Date().getTime()}`
      );

      const accEnergy = this.getCapabilityValue("meter_power");
      if (accEnergy !== result.accEnergy / 1000) {
        this.log(
          `meter_power changed: current: ${accEnergy} - new: ${result.accEnergy}`
        );
        this.setCapabilityValue(
          "meter_power",
          result.accEnergy / 1000
        ).catch(this.error);
      }

      const phase1Current = this.getCapabilityValue("measure_current.L1");
      const phase1New = result.phase1Current / 10;
      if (phase1Current !== phase1New) {
        this.log(
          `phase1Current changed: current: ${phase1Current} - new: ${phase1New}`
        );
        await this.setCapabilityValue(
          "measure_current.L1",
          phase1New
        ).catch(this.error);
      }

      const phase2Current = this.getCapabilityValue("measure_current.L2");
      const phase2New = result.phase2Current / 10;
      if (phase2Current !== phase2New) {
        this.log(
          `phase2Current changed: current: ${phase2Current} - new: ${phase2New}`
        );
        await this.setCapabilityValue(
          "measure_current.L2",
          phase2New
        ).catch(this.error);
      }

      const phase3Current = this.getCapabilityValue("measure_current.L3");
      const phase3New = result.phase3Current / 10;
      if (phase3Current !== phase3New) {
        this.log(
          `phase3Current changed: current: ${phase3Current} - new: ${phase3New}`
        );
        await this.setCapabilityValue(
          "measure_current.L3",
          phase3New
        ).catch(this.error);
      }

      this.currentStatus = result;
    } catch (e: any) {
      this.error(e);
    }
  }

  private getMeterInfoUrl() {
    return `${meterInfoUrl}${this.getSetting("loadBalanceType")}?_=`;
  }
}

module.exports = SmartMeterDevice;
