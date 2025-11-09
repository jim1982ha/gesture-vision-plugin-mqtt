/* FILE: extensions/plugins/gesture-vision-plugin-mqtt/frontend/index.tsx */
import type { FrontendPluginModule } from '#frontend/types/index.js';
import type { MqttActionInstanceSettings } from '../schemas.js';
import { MqttGlobalSettingsComponent } from './GlobalSettingsComponent.js';

const mqttPluginFrontendModule: FrontendPluginModule = {
    GlobalSettingsComponent: MqttGlobalSettingsComponent,
    actionSettingsFields: (context) => {
        const { translate } = context.services.translationService;
        return [
            { id: 'mqttTopic', type: 'text', labelKey: 'mqttTopicLabel', placeholderKey: 'mqttTopicPlaceholder', required: true },
            { id: 'mqttPayloadTemplate', type: 'textarea', rows: 3, labelKey: 'mqttPayloadTemplateLabel', placeholderKey: 'mqttPayloadTemplateInput', helpTextKey: 'mqttPayloadTemplateHelp' },
            { id: 'mqttOptions.qos', type: 'select', labelKey: 'QoS', optionsSource: async () => [
                { value: '0', label: translate('mqttQos0') }, { value: '1', label: translate('mqttQos1') }, { value: '2', label: translate('mqttQos2') },
            ]},
            { id: 'mqttOptions.retain', type: 'checkbox', labelKey: 'mqttRetainLabel' }
        ];
    },
    getActionDisplayDetails: (settings, context) => {
        const typedSettings = settings as MqttActionInstanceSettings;
        const { translate } = context.services.translationService;
        if (!typedSettings?.mqttTopic) return [{ icon: 'error_outline', value: translate("invalidMqttActionSettings") }];
        const details = [{ icon: 'rss_feed', value: typedSettings.mqttTopic }];
        if (typedSettings.mqttOptions) {
            const qosValue = typedSettings.mqttOptions.qos ?? 0;
            const retainValue = typedSettings.mqttOptions.retain ? translate('Yes') : translate('No');
            details.push({ icon: 'tune', value: `${translate("QoS")}: ${qosValue}, ${translate("Retain")}: ${retainValue}` });
        }
        return details;
    },
};

export default mqttPluginFrontendModule;