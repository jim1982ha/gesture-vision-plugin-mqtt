/* FILE: extensions/plugins/gesture-vision-plugin-mqtt/frontend/GlobalSettingsComponent.tsx */
import { useContext } from 'react';
import { AppContext } from '#frontend/contexts/AppContext.js';
import { usePluginConfigForm } from '#frontend/hooks/usePluginConfigForm.js';
import { PluginSettingsActions } from '#frontend/components/shared/PluginSettingsActions.js';
import type { PluginManifest } from '#shared/index.js';

export const MqttGlobalSettingsComponent = (props: { manifest: PluginManifest; onSaveSuccess?: () => void; onCancel?: () => void; }) => {
    // All hooks must be called unconditionally at the top level of the component.
    const context = useContext(AppContext);
    
    const { 
        formState, isDirty, isSaving, isTesting, 
        handleInputChange, handleSave, handleCancel: internalCancel, handleTest 
    } = usePluginConfigForm(
        props.manifest.id,
        { url: '', username: '', password: '' },
        { onSaveSuccess: props.onSaveSuccess, onCancel: props.onCancel }
    );

    // Guard clauses and other logic must come *after* all hook calls.
    if (!context) return null;
    
    const { translate } = context.services.translationService;
    const isActionDisabled = isSaving || isTesting || !formState.url;

    return (
        <div id={`plugin-settings-form-${props.manifest.id}`} className="plugin-global-settings-form">
            <div className="form-group">
                <label className="form-label" htmlFor={`${props.manifest.id}-url`}>{translate('mqttBrokerUrlGlobalLabel')}</label>
                <input id={`${props.manifest.id}-url`} type="text" className="form-control" value={formState.url} onChange={e => handleInputChange('url', e.target.value)} placeholder={translate('mqttBrokerUrlPlaceholder')} />
                <small className="form-help-text">{translate('mqttBrokerUrlGlobalHelp')}</small>
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label className="form-label" htmlFor={`${props.manifest.id}-username`}>{translate('mqttUsernameOptional')}</label>
                    <input id={`${props.manifest.id}-username`} type="text" className="form-control" value={formState.username || ''} onChange={e => handleInputChange('username', e.target.value)} autoComplete="username" />
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor={`${props.manifest.id}-password`}>{translate('mqttPasswordOptional')}</label>
                    <input id={`${props.manifest.id}-password`} type="password" className="form-control" value={formState.password || ''} onChange={e => handleInputChange('password', e.target.value)} autoComplete="current-password" />
                </div>
            </div>
            <PluginSettingsActions
                manifest={props.manifest}
                isDirty={isDirty}
                isSaving={isSaving}
                isTesting={isTesting}
                isActionDisabled={isActionDisabled}
                onCancel={internalCancel}
                onSave={handleSave}
                onTest={handleTest}
            />
        </div>
    );
};