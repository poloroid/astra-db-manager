<template>
  <div class="security-settings">
    <div class="settings-header">
      <h3>Security Settings</h3>
      <p class="text-muted">Manage encryption and security preferences</p>
    </div>

    <div class="settings-content">
      <!-- Keychain Status -->
      <div class="setting-item">
        <div class="setting-info">
          <h4>Encryption Key Storage</h4>
          <p class="text-muted">
            {{ getStorageDescription() }}
          </p>
          <div v-if="keychainStatus.diagnostics" class="diagnostics">
            <details>
              <summary>System Diagnostics</summary>
              <div class="diagnostics-content">
                <p><strong>Platform:</strong> {{ keychainStatus.diagnostics.platform }} ({{ keychainStatus.diagnostics.arch }})</p>
                <p><strong>Node Version:</strong> {{ keychainStatus.diagnostics.nodeVersion }}</p>
                <p><strong>Electron Version:</strong> {{ keychainStatus.diagnostics.electronVersion }}</p>
                <p><strong>Keytar Available:</strong> {{ keychainStatus.diagnostics.keytarAvailable ? 'Yes' : 'No' }}</p>
                <p v-if="keychainStatus.diagnostics.keytarError"><strong>Keytar Error:</strong> {{ keychainStatus.diagnostics.keytarError }}</p>
              </div>
            </details>
          </div>
        </div>
        <div class="setting-status">
          <span class="status-badge" :class="getStatusClass()">
            {{ getStatusIcon() }} {{ getStatusText() }}
          </span>
        </div>
      </div>

      <!-- Key Rotation -->
      <div class="setting-item">
        <div class="setting-info">
          <h4>Encryption Key Rotation</h4>
          <p class="text-muted">
            Rotate your encryption key for enhanced security. This will re-encrypt all stored data.
          </p>
        </div>
        <div class="setting-action">
          <button 
            @click="rotateKey" 
            class="btn btn-outline"
            :disabled="rotating"
          >
            <span v-if="rotating" class="spinner"></span>
            <span v-else>🔄</span>
            {{ rotating ? 'Rotating...' : 'Rotate Key' }}
          </button>
        </div>
      </div>

      <!-- Security Information -->
      <div class="security-info">
        <h4>Security Features</h4>
        <ul class="security-features">
          <li>✅ AES-256 encryption for all stored data</li>
          <li>✅ OS keychain integration for key storage</li>
          <li>✅ Secure file fallback when keychain unavailable</li>
          <li>✅ No sensitive data transmitted over networks</li>
          <li>✅ Automatic cleanup of temporary files</li>
          <li>✅ Context isolation prevents unauthorized access</li>
        </ul>
      </div>

      <!-- Alerts -->
      <div v-if="alert" class="alert" :class="`alert-${alert.type}`">
        {{ alert.message }}
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
  name: 'SecuritySettings',
  setup() {
    const keychainStatus = ref({ keychainAvailable: false });
    const rotating = ref(false);
    const alert = ref(null);

    const checkKeychainStatus = async () => {
      try {
        const result = await window.electronAPI.checkKeychainStatus();
        if (result.success) {
          keychainStatus.value = result;
        }
      } catch (error) {
        console.error('Error checking keychain status:', error);
        keychainStatus.value = { keychainAvailable: false, storageMethod: 'unknown' };
      }
    };

    const getStatusClass = () => {
      if (keychainStatus.value.keychainAvailable) {
        return 'status-secure';
      } else if (keychainStatus.value.storageMethod === 'fallback') {
        return 'status-fallback';
      } else {
        return 'status-unknown';
      }
    };

    const getStatusIcon = () => {
      if (keychainStatus.value.keychainAvailable) {
        return '🔐';
      } else if (keychainStatus.value.storageMethod === 'fallback') {
        return '📁';
      } else {
        return '❓';
      }
    };

    const getStatusText = () => {
      if (keychainStatus.value.keychainAvailable) {
        return 'Keychain';
      } else if (keychainStatus.value.storageMethod === 'fallback') {
        return 'File Storage';
      } else {
        return 'Unknown';
      }
    };

    const getStorageDescription = () => {
      if (keychainStatus.value.keychainAvailable) {
        return 'Your encryption key is securely stored in the system keychain.';
      } else if (keychainStatus.value.diagnostics?.keytarError) {
        return `Using secure file storage. Keychain unavailable: ${keychainStatus.value.diagnostics.keytarError}`;
      } else {
        return 'Using secure file storage as keychain is not available on this system.';
      }
    };

    const rotateKey = async () => {
      if (!confirm('Are you sure you want to rotate the encryption key? This will re-encrypt all stored data.')) {
        return;
      }

      rotating.value = true;
      alert.value = null;

      try {
        const result = await window.electronAPI.rotateEncryptionKey();
        if (result.success) {
          alert.value = {
            type: 'success',
            message: result.message
          };
        } else {
          alert.value = {
            type: 'danger',
            message: 'Failed to rotate encryption key: ' + result.error
          };
        }
      } catch (error) {
        alert.value = {
          type: 'danger',
          message: 'Error rotating encryption key: ' + error.message
        };
      } finally {
        rotating.value = false;
        // Refresh keychain status after rotation
        await checkKeychainStatus();
        // Clear alert after 5 seconds
        setTimeout(() => {
          alert.value = null;
        }, 5000);
      }
    };

    onMounted(() => {
      checkKeychainStatus();
    });

    return {
      keychainStatus,
      rotating,
      alert,
      rotateKey,
      getStatusClass,
      getStatusIcon,
      getStatusText
    };
  }
};
</script>

<style scoped>
.security-settings {
  max-width: 800px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: 32px;
  text-align: center;
}

.settings-header h3 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-dark-gunmetal);
  font-family: var(--font-primary);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border: 1px solid var(--color-platinum);
  border-radius: 8px;
  transition: border-color 0.15s ease;
}

.setting-item:hover {
  border-color: var(--color-sky-blue);
}

.setting-info {
  flex: 1;
}

.setting-info h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--color-dark-gunmetal);
  font-family: var(--font-primary);
}

.setting-info p {
  font-size: 14px;
  color: var(--color-soft-purple);
  margin: 0;
}

.setting-status {
  margin-left: 16px;
}

.setting-action {
  margin-left: 16px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.status-secure {
  background: #e8f5e8;
  color: #00a651;
}

.status-fallback {
  background: #fff8e1;
  color: #f39c12;
}

.status-unknown {
  background: #ffeaea;
  color: #e74c3c;
}

.diagnostics {
  margin-top: 12px;
}

details {
  cursor: pointer;
}

details summary {
  font-size: 12px;
  color: var(--color-soft-purple);
  font-weight: 500;
  margin-bottom: 8px;
}

.diagnostics-content {
  background: var(--color-alabaster);
  padding: 12px;
  border-radius: 6px;
  border: 1px solid var(--color-platinum);
  font-size: 12px;
  line-height: 1.4;
}

.diagnostics-content p {
  margin: 4px 0;
  color: var(--color-dark-gunmetal);
}

.security-info {
  padding: 20px;
  background: var(--color-alabaster);
  border: 1px solid var(--color-platinum);
  border-radius: 8px;
}

.security-info h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-dark-gunmetal);
  font-family: var(--font-primary);
}

.security-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.security-features li {
  padding: 4px 0;
  font-size: 14px;
  color: var(--color-dark-gunmetal);
}

.alert {
  margin-top: 16px;
}

/* Dark mode styles */
[data-theme="dark"] .setting-item {
  background: var(--color-dark-bg-secondary);
  border: 1px solid var(--color-dark-border);
}

[data-theme="dark"] .setting-item:hover {
  border-color: var(--color-dark-accent);
}

[data-theme="dark"] .setting-info h4 {
  color: var(--color-dark-text);
}

[data-theme="dark"] .setting-info p {
  color: var(--color-dark-text-secondary);
}

[data-theme="dark"] .security-info {
  background: var(--color-dark-bg-hover);
  border: 1px solid var(--color-dark-border);
}

[data-theme="dark"] .security-info h4 {
  color: var(--color-dark-text);
}

[data-theme="dark"] .security-features li {
  color: var(--color-dark-text);
}

[data-theme="dark"] details summary {
  color: var(--color-dark-text-secondary);
}

[data-theme="dark"] .diagnostics-content {
  background: var(--color-dark-bg-hover);
  border: 1px solid var(--color-dark-border);
}

[data-theme="dark"] .diagnostics-content p {
  color: var(--color-dark-text);
}

@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }
  
  .setting-status,
  .setting-action {
    margin-left: 0;
    align-self: flex-start;
  }
}
</style>

