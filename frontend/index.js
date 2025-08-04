/* FILE: extensions/plugins/mqtt/frontend/index.js */
const { translate } = window.GestureVision.services; 
const { BasePluginGlobalSettingsComponent, GenericPluginActionSettingsComponent } = window.GestureVision.ui.components;

const mqttGlobalSettingsFields = [
    { id: 'url', type: 'text', labelKey: 'mqttBrokerUrlGlobalLabel', placeholderKey: 'mqttBrokerUrlPlaceholder', helpTextKey: 'mqttBrokerUrlGlobalHelp', required: false },
    { id: 'username', type: 'text', labelKey: 'mqttUsernameOptional' },
    { id: 'password', type: 'password', labelKey: 'mqttPasswordOptional' },
];

class MqttGlobalSettingsComponent extends BasePluginGlobalSettingsComponent {
    constructor(pluginId, manifest, context) {
        super(pluginId, manifest, context, mqttGlobalSettingsFields);
    }
}
export const createMqttGlobalSettingsComponent = (pluginId, manifest, context) => new MqttGlobalSettingsComponent(pluginId, manifest, context);

const mqttPluginFrontendModule = {
    manifest: { /* will be populated by loader */ },
    
    createGlobalSettingsComponent: createMqttGlobalSettingsComponent,
    
    createActionSettingsComponent: (pluginId, manifest, context) => {
        const actionSettingsFields = [
            { id: 'mqttTopic', type: 'text', labelKey: 'mqttTopicLabel', placeholderKey: 'mqttTopicPlaceholder', required: true },
            { id: 'mqttPayloadTemplate', type: 'textarea', rows: 3, labelKey: 'mqttPayloadTemplateLabel', placeholderKey: 'mqttPayloadTemplateInput', helpTextKey: 'mqttPayloadTemplateHelp' },
            {
                id: 'mqttOptions.qos', type: 'select', labelKey: 'QoS', optionsSource: async () => [
                    { value: '0', label: translate('mqttQos0') },
                    { value: '1', label: translate('mqttQos1') },
                    { value: '2', label: translate('mqttQos2') },
                ]
            },
            { id: 'mqttOptions.retain', type: 'checkbox', labelKey: 'mqttRetainLabel' }
        ];
        return new GenericPluginActionSettingsComponent(pluginId, actionSettingsFields, context);
    },

    getActionDisplayDetails: (settings) => {
        if (!settings?.mqttTopic) return [{ icon: 'error_outline', value: translate("invalidMqttActionSettings") }];
        const details = [{ icon: 'rss_feed', value: settings.mqttTopic }];
        if (settings.mqttOptions) {
            const qosValue = settings.mqttOptions.qos ?? 0;
            const retainValue = settings.mqttOptions.retain ? translate('Yes') : translate('No');
            details.push({ icon: 'tune', value: `${translate("QoS")}: ${qosValue}, ${translate("Retain")}: ${retainValue}` });
        }
        return details;
    },
};

export default mqttPluginFrontendModule;