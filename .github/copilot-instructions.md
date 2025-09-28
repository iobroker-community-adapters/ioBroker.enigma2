# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.4.0
**Template Source:** https://github.com/DrozmotiX/ioBroker-Copilot-Instructions

This file contains instructions and best practices for GitHub Copilot when working on ioBroker adapter development.

## Project Context

You are working on an ioBroker adapter. ioBroker is an integration platform for the Internet of Things, focused on building smart home and industrial IoT solutions. Adapters are plugins that connect ioBroker to external systems, devices, or services.

### Enigma2 Adapter Specific Context

This adapter connects ioBroker to Enigma2-based receivers (VU+, Dreambox, EDISON, etc.) to:
- Retrieve receiver status information (channel, program info, standby state, volume, etc.)
- Send commands to control the receiver (channel switching, power management, messages)
- Monitor recording status and timer information
- Access movie lists and channel icons (via OpenWebIF)

**Key Technologies:**
- HTTP/HTTPS requests to Enigma2 OpenWebIF API
- XML parsing for receiver responses (xml2js)
- Network connectivity testing (ping)
- Message display functionality with different types (Yes/No, Info, Message, Attention)
- Alexa integration for voice commands

**Configuration Requirements:**
- IP address and credentials for Enigma2 receiver
- Web interface selection (enabled/disabled for additional features like channel icons)
- Polling intervals for different data types
- Message timeout and type settings

## Testing

### Unit Testing
- Use Jest as the primary testing framework for ioBroker adapters
- Create tests for all adapter main functions and helper methods
- Test error handling scenarios and edge cases
- Mock external API calls and hardware dependencies
- For adapters connecting to APIs/devices not reachable by internet, provide example data files to allow testing of functionality without live connections
- Example test structure:
  ```javascript
  describe('AdapterName', () => {
    let adapter;
    
    beforeEach(() => {
      // Setup test adapter instance
    });
    
    test('should initialize correctly', () => {
      // Test adapter initialization
    });
  });
  ```

### Integration Testing

**IMPORTANT**: Use the official `@iobroker/testing` framework for all integration tests. This is the ONLY correct way to test ioBroker adapters.

**Official Documentation**: https://github.com/ioBroker/testing

#### Framework Structure
Integration tests MUST follow this exact pattern:

```javascript
const path = require('path');
const { tests } = require('@iobroker/testing');

// Define test coordinates or configuration
const TEST_COORDINATES = '52.520008,13.404954'; // Berlin
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

// Use tests.integration() with defineAdditionalTests
tests.integration(path.join(__dirname, '..'), {
    defineAdditionalTests({ suite }) {
        suite('Test adapter with specific configuration', (getHarness) => {
            let harness;

            before(() => {
                harness = getHarness();
            });

            it('should configure and start adapter', function () {
                return new Promise(async (resolve, reject) => {
                    try {
                        harness = getHarness();
                        
                        // Get adapter object using promisified pattern
                        const obj = await new Promise((res, rej) => {
                            harness.objects.getObject('system.adapter.your-adapter.0', (err, o) => {
                                if (err) return rej(err);
                                res(o);
                            });
                        });
                        
                        if (!obj) {
                            return reject(new Error('Adapter object not found'));
                        }

                        // Configure adapter properties
                        Object.assign(obj.native, {
                            position: TEST_COORDINATES,
                            createCurrently: true,
                            createHourly: true,
                            createDaily: true,
                            // Add other configuration as needed
                        });

                        // Set the updated configuration
                        harness.objects.setObject(obj._id, obj);

                        console.log('✅ Step 1: Configuration written, starting adapter...');
                        
                        // Start adapter and wait
                        await harness.startAdapterAndWait();
                        
                        console.log('✅ Step 2: Adapter started');

                        // Wait for adapter to process data
                        const waitMs = 15000;
                        await wait(waitMs);

                        console.log('🔍 Step 3: Checking states after adapter run...');
                        
                        // Verify required states exist
                        await Promise.all([
                            harness.states.getStateAsync('your-adapter.0.info.connection'),
                            harness.states.getStateAsync('your-adapter.0.currently'),
                        ].map(async (promise, i) => {
                            const state = await promise;
                            if (!state) {
                                throw new Error(`Expected state not found (${i})`);
                            }
                        }));
                        
                        console.log('✅ All expected states found.');
                        resolve();
                    } catch (error) {
                        console.error('❌ Test failed:', error.message);
                        reject(error);
                    }
                });
            }).timeout(60000);
        });
    }
});
```

#### Error Handling Strategy
**Critical Success Factor**: Error handling is essential for ioBroker integration tests. Follow these patterns:

```javascript
// ✅ Proper Integration Test Pattern
it('should handle adapter lifecycle', async function() {
    try {
        // Always validate harness state first
        if (harness.isAdapterRunning()) {
            console.log('Stopping adapter before test...');
            await harness.stopAdapter();
        }
        
        // Configuration phase
        await harness.changeAdapterConfig('your-adapter', {
            native: {
                // Your configuration
            }
        });
        
        console.log('Starting adapter...');
        await harness.startAdapter();
        
        // Wait for initialization
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        // Validate states with proper error handling
        const states = await Promise.allSettled([
            harness.states.getStateAsync('your-adapter.0.info.connection'),
            harness.states.getStateAsync('your-adapter.0.main-data')
        ]);
        
        states.forEach((result, index) => {
            if (result.status === 'rejected') {
                throw new Error(`State ${index} check failed: ${result.reason}`);
            }
            if (!result.value) {
                throw new Error(`Expected state ${index} not found`);
            }
        });
        
        console.log('✅ Test completed successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        // Always cleanup
        if (harness && harness.isAdapterRunning()) {
            await harness.stopAdapter();
        }
    }
}).timeout(120000);
```

## ioBroker Adapter Core Patterns

### Standard Adapter Structure
```javascript
const utils = require('@iobroker/adapter-core');

class AdapterName extends utils.Adapter {
  constructor(options = {}) {
    super({
      ...options,
      name: 'adapter-name',
    });
    
    this.on('ready', this.onReady.bind(this));
    this.on('stateChange', this.onStateChange.bind(this));
    this.on('unload', this.onUnload.bind(this));
  }

  async onReady() {
    // Initialize adapter
    this.setState('info.connection', true, true);
  }

  onStateChange(id, state) {
    if (state) {
      // Handle state changes
    }
  }

  onUnload(callback) {
    try {
      // Cleanup resources
      callback();
    } catch (e) {
      callback();
    }
  }
}

new AdapterName();
```

### State Management
```javascript
// Create state objects
await this.setObjectNotExistsAsync('data.value', {
  type: 'state',
  common: {
    name: 'Data Value',
    type: 'number',
    role: 'value',
    read: true,
    write: false,
  },
  native: {},
});

// Update state values
await this.setStateAsync('data.value', { val: 42, ack: true });
```

### Error Handling and Logging
```javascript
// Use appropriate log levels
this.log.debug('Debug information');
this.log.info('General information');
this.log.warn('Warning message');
this.log.error('Error occurred: ' + error.message);

// Handle async operations
try {
  const result = await apiCall();
  this.setState('connection', true, true);
} catch (error) {
  this.log.error('API call failed: ' + error.message);
  this.setState('connection', false, true);
}
```

### Resource Cleanup
```javascript
onUnload(callback) {
  try {
    // Clear intervals and timeouts
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = undefined;
    }
    // Close connections, clean up resources
    callback();
  } catch (e) {
    callback();
  }
}
```

## Code Style and Standards

- Follow JavaScript/TypeScript best practices
- Use async/await for asynchronous operations
- Implement proper resource cleanup in `unload()` method
- Use semantic versioning for adapter releases
- Include proper JSDoc comments for public methods

## CI/CD and Testing Integration

### GitHub Actions for API Testing
For adapters with external API dependencies, implement separate CI/CD jobs:

```yaml
# Tests API connectivity with demo credentials (runs separately)
demo-api-tests:
  if: contains(github.event.head_commit.message, '[skip ci]') == false
  
  runs-on: ubuntu-22.04
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Use Node.js 20.x
      uses: actions/setup-node@v4
      with:
        node-version: 20.x
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run demo API tests
      run: npm run test:integration-demo
```

### CI/CD Best Practices
- Run credential tests separately from main test suite
- Use ubuntu-22.04 for consistency
- Don't make credential tests required for deployment
- Provide clear failure messages for API connectivity issues
- Use appropriate timeouts for external API calls (120+ seconds)

### Package.json Script Integration
Add dedicated script for credential testing:
```json
{
  "scripts": {
    "test:integration-demo": "mocha test/integration-demo --exit"
  }
}
```

### Practical Example: Complete API Testing Implementation
Here's a complete example based on lessons learned from the Discovergy adapter:

#### test/integration-demo.js
```javascript
const path = require("path");
const { tests } = require("@iobroker/testing");

// Helper function to encrypt password using ioBroker's encryption method
async function encryptPassword(harness, password) {
    const systemConfig = await harness.objects.getObjectAsync("system.config");
    
    if (!systemConfig || !systemConfig.native || !systemConfig.native.secret) {
        throw new Error("Could not retrieve system secret for password encryption");
    }
    
    const secret = systemConfig.native.secret;
    let result = '';
    for (let i = 0; i < password.length; ++i) {
        result += String.fromCharCode(secret[i % secret.length].charCodeAt(0) ^ password.charCodeAt(i));
    }
    
    return result;
}

// Run integration tests with demo credentials
tests.integration(path.join(__dirname, ".."), {
    defineAdditionalTests({ suite }) {
        suite("API Testing with Demo Credentials", (getHarness) => {
            let harness;
            
            before(() => {
                harness = getHarness();
            });

            it("Should connect to API and initialize with demo credentials", async () => {
                console.log("Setting up demo credentials...");
                
                if (harness.isAdapterRunning()) {
                    await harness.stopAdapter();
                }
                
                const encryptedPassword = await encryptPassword(harness, "demo_password");
                
                await harness.changeAdapterConfig("your-adapter", {
                    native: {
                        username: "demo@provider.com",
                        password: encryptedPassword,
                        // other config options
                    }
                });

                console.log("Starting adapter with demo credentials...");
                await harness.startAdapter();
                
                // Wait for API calls and initialization
                await new Promise(resolve => setTimeout(resolve, 60000));
                
                const connectionState = await harness.states.getStateAsync("your-adapter.0.info.connection");
                
                if (connectionState && connectionState.val === true) {
                    console.log("✅ SUCCESS: API connection established");
                    return true;
                } else {
                    throw new Error("API Test Failed: Expected API connection to be established with demo credentials. " +
                        "Check logs above for specific API errors (DNS resolution, 401 Unauthorized, network issues, etc.)");
                }
            }).timeout(120000);
        });
    }
});
```

### Enigma2 Adapter Testing Patterns

For the Enigma2 adapter, consider these specific testing scenarios:

```javascript
// Mock Enigma2 receiver responses
const mockEnigmaResponse = {
    channel: 'Das Erste HD',
    servicereference: '1:0:19:283D:3FB:1:C00000:0:0:0:',
    volume: 25,
    standby: false,
    muted: false
};

// Test receiver communication without actual hardware
it('should parse Enigma2 XML responses correctly', () => {
    const xmlResponse = `<?xml version="1.0" encoding="UTF-8"?>
        <e2channel>
            <e2servicereference>1:0:19:283D:3FB:1:C00000:0:0:0:</e2servicereference>
            <e2servicename>Das Erste HD</e2servicename>
        </e2channel>`;
    
    // Test XML parsing logic
    const parsed = parseEnigma2Response(xmlResponse);
    expect(parsed.channel).toBe('Das Erste HD');
});
```