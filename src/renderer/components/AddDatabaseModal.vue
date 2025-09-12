<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">Add New Database Connection</h3>
        <button @click="$emit('close')" class="modal-close">×</button>
      </div>
      
      <div class="modal-body">
        <form @submit.prevent="handleSubmit">
          <!-- Database Name -->
          <div class="form-group">
            <label for="dbName" class="form-label">Database Name</label>
            <input
              id="dbName"
              v-model="form.name"
              type="text"
              class="form-control"
              placeholder="Enter a name for this database connection"
              required
            />
          </div>

          <!-- SCB File Upload -->
          <div class="form-group">
            <label class="form-label">Secure Connect Bundle (SCB)</label>
            <div 
              class="file-upload"
              :class="{ 'dragover': isDragover }"
              @click="selectScbFile"
              @dragover.prevent="isDragover = true"
              @dragleave.prevent="isDragover = false"
              @drop.prevent="handleScbDrop"
            >
              <div v-if="!form.scbPath" class="file-upload-content">
                <div class="file-upload-icon">📁</div>
                <div class="file-upload-text">Click to select SCB file or drag and drop</div>
                <div class="file-upload-hint">Select your secure-connect-bundle.zip file</div>
              </div>
              <div v-else class="file-selected">
                <div class="file-info">
                  <span class="file-icon">✅</span>
                  <span class="file-name">{{ getFileName(form.scbPath) }}</span>
                </div>
                <button type="button" @click.stop="clearScbFile" class="btn btn-outline btn-sm">
                  Change File
                </button>
              </div>
            </div>
          </div>

          <!-- Credentials File Upload -->
          <div class="form-group">
            <label class="form-label">Credentials JSON</label>
            <div 
              class="file-upload"
              :class="{ 'dragover': isDragover }"
              @click="selectCredentialsFile"
              @dragover.prevent="isDragover = true"
              @dragleave.prevent="isDragover = false"
              @drop.prevent="handleCredentialsDrop"
            >
              <div v-if="!form.credentialsPath" class="file-upload-content">
                <div class="file-upload-icon">🔐</div>
                <div class="file-upload-text">Click to select credentials file or drag and drop</div>
                <div class="file-upload-hint">Select your credentials.json file</div>
              </div>
              <div v-else class="file-selected">
                <div class="file-info">
                  <span class="file-icon">✅</span>
                  <span class="file-name">{{ getFileName(form.credentialsPath) }}</span>
                </div>
                <button type="button" @click.stop="clearCredentialsFile" class="btn btn-outline btn-sm">
                  Change File
                </button>
              </div>
            </div>
          </div>

          <!-- Test Connection Section -->
          <div class="test-section">
            <div class="test-header">
              <h4>Test Connection</h4>
              <p class="text-muted">Verify your connection before saving</p>
            </div>
            
            <div class="test-actions">
              <button 
                type="button"
                @click="testConnection"
                class="btn btn-outline"
                :disabled="testing || !canTest"
              >
                <span v-if="testing" class="spinner"></span>
                <span v-else>🔍</span>
                {{ testing ? 'Testing Connection...' : 'Test Connection' }}
              </button>
              <p v-if="!canTest" class="test-hint text-muted">
                Upload both SCB and credentials files to enable testing
              </p>
            </div>

            <!-- Test Results -->
            <div v-if="testResult" class="test-result">
              <div class="alert" :class="`alert-${testResult.type}`">
                {{ testResult.message }}
              </div>
            </div>
          </div>
        </form>
      </div>
      
      <div class="modal-footer">
        <button @click="$emit('close')" class="btn btn-secondary">
          Cancel
        </button>
        <button 
          @click="handleSubmit"
          class="btn btn-primary"
          :disabled="!canSave || saving"
        >
          <span v-if="saving" class="spinner"></span>
          <span v-else>💾</span>
          {{ saving ? 'Saving...' : 'Save Database' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';

export default {
  name: 'AddDatabaseModal',
  emits: ['close', 'database-added'],
  setup(props, { emit }) {
    const form = ref({
      name: '',
      scbPath: '',
      credentialsPath: ''
    });

    const isDragover = ref(false);
    const testing = ref(false);
    const saving = ref(false);
    const testResult = ref(null);

    const canTest = computed(() => {
      return form.value.scbPath && form.value.credentialsPath;
    });

    const canSave = computed(() => {
      return form.value.name.trim() && 
             form.value.scbPath && 
             form.value.credentialsPath &&
             testResult.value?.type === 'success';
    });

    const selectScbFile = async () => {
      try {
        const result = await window.electronAPI.selectFile({
          title: 'Select Secure Connect Bundle (SCB)',
          filters: [
            { name: 'ZIP Files', extensions: ['zip'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (result.success && result.filePaths.length > 0) {
          form.value.scbPath = result.filePaths[0];
          testResult.value = null; // Clear previous test result
        }
      } catch (error) {
        console.error('Error selecting SCB file:', error);
      }
    };

    const selectCredentialsFile = async () => {
      try {
        const result = await window.electronAPI.selectFile({
          title: 'Select Credentials JSON',
          filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile']
        });

        if (result.success && result.filePaths.length > 0) {
          form.value.credentialsPath = result.filePaths[0];
          testResult.value = null; // Clear previous test result
        }
      } catch (error) {
        console.error('Error selecting credentials file:', error);
      }
    };

    const handleScbDrop = (event) => {
      isDragover.value = false;
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        form.value.scbPath = files[0].path;
        testResult.value = null;
      }
    };

    const handleCredentialsDrop = (event) => {
      isDragover.value = false;
      const files = event.dataTransfer.files;
      if (files.length > 0) {
        form.value.credentialsPath = files[0].path;
        testResult.value = null;
      }
    };

    const clearScbFile = () => {
      form.value.scbPath = '';
      testResult.value = null;
    };

    const clearCredentialsFile = () => {
      form.value.credentialsPath = '';
      testResult.value = null;
    };

    const getFileName = (filePath) => {
      return filePath.split('/').pop() || filePath.split('\\').pop();
    };

    const testConnection = async () => {
      testing.value = true;
      testResult.value = null;

      try {
        const result = await window.electronAPI.testAstraConnection(
          form.value.scbPath,
          form.value.credentialsPath
        );

        if (result.success) {
          testResult.value = {
            type: 'success',
            message: result.message || 'Connection test successful! Your credentials are valid.'
          };
        } else {
          testResult.value = {
            type: 'danger',
            message: result.error || 'Connection test failed. Please check your files and try again.'
          };
        }
      } catch (error) {
        testResult.value = {
          type: 'danger',
          message: 'Error testing connection: ' + error.message
        };
      } finally {
        testing.value = false;
      }
    };

    const handleSubmit = async () => {
      if (!canSave.value) return;

      saving.value = true;

      try {
        const result = await window.electronAPI.saveDbCredentials({
          name: form.value.name.trim(),
          scbPath: form.value.scbPath,
          credentialsPath: form.value.credentialsPath
        });

        if (result.success) {
          emit('database-added', {
            id: result.dbId,
            name: form.value.name.trim(),
            scbPath: form.value.scbPath,
            credentialsPath: form.value.credentialsPath,
            createdAt: new Date().toISOString(),
            status: 'Connected'
          });
          emit('close');
        } else {
          testResult.value = {
            type: 'danger',
            message: 'Failed to save database: ' + result.error
          };
        }
      } catch (error) {
        testResult.value = {
          type: 'danger',
          message: 'Error saving database: ' + error.message
        };
      } finally {
        saving.value = false;
      }
    };

    const handleOverlayClick = (event) => {
      if (event.target === event.currentTarget) {
        emit('close');
      }
    };

    return {
      form,
      isDragover,
      testing,
      saving,
      testResult,
      canTest,
      canSave,
      selectScbFile,
      selectCredentialsFile,
      handleScbDrop,
      handleCredentialsDrop,
      clearScbFile,
      clearCredentialsFile,
      getFileName,
      testConnection,
      handleSubmit,
      handleOverlayClick
    };
  }
};
</script>

<style scoped>
.modal {
  max-width: 700px;
}

.form-group {
  margin-bottom: 2rem;
}

.file-upload {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-upload-content {
  text-align: center;
}

.file-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid #e9ecef;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.file-icon {
  font-size: 1.2rem;
}

.file-name {
  font-weight: 500;
  color: #333;
}

.test-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.test-header {
  margin-bottom: 1rem;
}

.test-header h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.test-actions {
  margin-bottom: 1rem;
}

.test-hint {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  font-style: italic;
}

/* Dark mode styles */
[data-theme="dark"] .test-section {
  background: var(--color-dark-bg-hover);
  border: 1px solid var(--color-dark-border);
}

[data-theme="dark"] .test-header h4 {
  color: var(--color-dark-text);
}

[data-theme="dark"] .file-selected {
  background: var(--color-dark-bg-hover);
  border: 2px solid var(--color-dark-border);
}

[data-theme="dark"] .file-name {
  color: var(--color-dark-text);
}

.test-result {
  margin-top: 1rem;
}

.alert {
  margin: 0;
}

@media (max-width: 768px) {
  .file-selected {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
  
  .test-section {
    padding: 1rem;
  }
}
</style>
