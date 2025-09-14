/* FILE: extensions/plugins/mqtt/frontend/index.js */

// Ensure the global registry exists
if (!window.GestureVisionPlugins) {
  window.GestureVisionPlugins = {};
}

const mqttPluginFrontendModule = {
    manifest: { /* will be populated by loader */ },
    
    createGlobalSettingsComponent: (pluginId, manifest, context) => {
        const { uiComponents } = context;
        const { BasePluginGlobalSettingsComponent } = uiComponents;

        const mqttGlobalSettingsFields = [
            { id: 'url', type: 'text', labelKey: 'mqttBrokerUrlGlobalLabel', placeholderKey: 'mqttBrokerUrlPlaceholder', helpTextKey: 'mqttBrokerUrlGlobalHelp', required: false },
            { id: 'username', type: 'text', labelKey: 'mqttUsernameOptional', autocomplete: 'username' },
            { id: 'password', type: 'password', labelKey: 'mqttPasswordOptional', autocomplete: 'current-password' },
        ];
        return new BasePluginGlobalSettingsComponent(pluginId, manifest, context, mqttGlobalSettingsFields);
    },
    
    actionSettingsFields: (context) => {
        const { translate } = context.services.translationService;
        return [
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
    },

    getActionDisplayDetails: (settings, context) => {
        const { translate } = context.services.translationService;
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

// Register the module with the global registry
window.GestureVisionPlugins['gesture-vision-plugin-mqtt'] = mqttPluginFrontendModule;

export default mqttPluginFrontendModule;