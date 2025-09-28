# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.4.0
**Template Source:** https://github.com/DrozmotiX/ioBroker-Copilot-Instructions

This file contains instructions and best practices for GitHub Copilot when working on ioBroker adapter development.

## Project Context

You are working on an ioBroker adapter. ioBroker is an integration platform for the Internet of Things, focused on building smart home and industrial IoT solutions. Adapters are plugins that connect ioBroker to external systems, devices, or services.

**Adapter-Specific Context:**
- **Adapter Name:** enigma2
- **Primary Function:** Connects to enigma2-based set-top boxes (VU+, Dreambox, EDISON) for home automation integration
- **Key Features:** Remote control commands, channel switching, volume control, standby management, EPG data, timer management, message display
- **Target Devices:** Linux-based satellite/cable receivers running enigma2 firmware
- **Communication Protocol:** HTTP REST API via OpenWebif interface
- **Key Dependencies:** xml2js for XML parsing, ping for network connectivity checks
- **Configuration Requirements:** IP address, port, authentication credentials for receiver access

## Testing

### Unit Testing
- Use Jest as the primary testing framework for ioBroker adapters
- Follow the ioBroker testing patterns with `@iobroker/testing`
- Test files should be in the `test/` directory
- Use `mocha` and `chai` for assertions as configured in the project
- Integration tests should cover adapter startup, configuration validation, and API communication
- Mock external HTTP requests to enigma2 receivers for reliable testing

### Test Structure
```javascript
// Example test structure for enigma2 adapter
const { tests } = require('@iobroker/testing');
const path = require('path');

// Integration test
tests.integration(path.join(__dirname, '..'));

// Unit test example
describe('enigma2 adapter', function() {
    it('should connect to receiver', async function() {
        // Test receiver connection logic
    });
    
    it('should parse XML responses correctly', async function() {
        // Test XML parsing with xml2js
    });
});
```

## Code Quality

### Linting and Formatting
- Use `@iobroker/eslint-config` for consistent code style (already configured)
- Run `npm run lint` to check code quality
- Use `prettier` for code formatting (configured via prettier.config.mjs)
- Follow async/await patterns for HTTP requests and state operations

### Error Handling
- Always wrap HTTP requests in try-catch blocks
- Implement proper timeout handling for receiver communication
- Log errors with appropriate levels (adapter.log.error, adapter.log.warn)
- Handle network connectivity issues gracefully with ping checks

## ioBroker-Specific Patterns

### Adapter Structure
```javascript
// Main adapter setup pattern
const utils = require('@iobroker/adapter-core');

class Enigma2Adapter extends utils.Adapter {
    constructor(options = {}) {
        super({
            ...options,
            name: 'enigma2',
        });
    }

    async onReady() {
        // Initialize adapter
        await this.setObjectNotExistsAsync('enigma2.CHANNEL', {
            type: 'state',
            common: {
                type: 'string',
                role: 'state',
                name: 'Channel Name',
                read: true,
                write: false,
            },
            native: {},
        });
    }

    onUnload(callback) {
        // Clean up resources
        if (this.eventInterval) clearInterval(this.eventInterval);
        if (this.deviceInfoInterval) clearInterval(this.deviceInfoInterval);
        callback();
    }
}
```

### State Management
- Use `adapter.setObjectNotExistsAsync()` to create states
- Follow ioBroker state naming conventions: `enigma2.PROPERTY_NAME`
- Set appropriate roles for states (media.mute, level.volume, button, etc.)
- Use descriptive names in both English and German
- Mark command states as write-only (read: false, write: true)
- Mark status states as read-only (read: true, write: false)

### Configuration Handling
```javascript
// Access adapter configuration
const config = this.config;
const ipAddress = config.IPAddress;
const port = config.Port;
const username = config.Username;
const password = config.Password;
```

### HTTP Communication Pattern
```javascript
// Enigma2 API communication pattern
const http = require('http');

function makeRequest(path, callback) {
    const options = {
        hostname: adapter.config.IPAddress,
        port: adapter.config.Port,
        path: path,
        auth: `${adapter.config.Username}:${adapter.config.Password}`
    };

    const req = http.get(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                callback(null, data);
            } else {
                callback(new Error(`HTTP ${res.statusCode}`), null);
            }
        });
    });

    req.on('error', callback);
    req.setTimeout(5000, () => {
        req.destroy();
        callback(new Error('Request timeout'), null);
    });
}
```

## Development Workflow

### File Organization
- **main.js**: Primary adapter logic and HTTP communication
- **io-package.json**: Adapter metadata and state definitions
- **admin/**: Configuration interface files
- **test/**: Test files using `@iobroker/testing` framework

### Common Tasks for Enigma2 Adapter

#### Adding New Commands
When adding new remote control commands:
1. Add state definition in `main.js` using `setObjectNotExistsAsync`
2. Add corresponding command handler in state change listener
3. Map command to enigma2 API endpoint
4. Update documentation in README.md

#### State Updates
- Use appropriate update intervals (default: 5000ms for status, 30000ms for device info)
- Handle connection losses gracefully
- Clear intervals in `onUnload()` method

#### XML Parsing
- Use xml2js library for parsing enigma2 API responses
- Handle parsing errors appropriately
- Extract relevant data fields (channel info, timer data, etc.)

## Debugging

### Logging
```javascript
adapter.log.error('Connection failed: ' + error.message);
adapter.log.warn('Receiver not responding, retrying...');
adapter.log.info('Channel changed to: ' + channelName);
adapter.log.debug('Raw XML response: ' + xmlData);
```

### Common Issues
- **Connection timeouts**: Increase timeout values, check network connectivity
- **Authentication failures**: Verify credentials in adapter configuration  
- **XML parsing errors**: Log raw responses, validate XML structure
- **State update failures**: Check state definitions and data types

## Dependencies and Libraries

### Core Dependencies
- `@iobroker/adapter-core`: ioBroker adapter framework
- `xml2js`: XML parsing for enigma2 API responses  
- `ping`: Network connectivity testing
- `http`: HTTP client for API communication

### Development Dependencies
- `@iobroker/testing`: Testing framework for adapters
- `@iobroker/eslint-config`: Code linting configuration
- `mocha`, `chai`: Testing libraries
- `@alcalzone/release-script`: Automated release management

## Security Considerations

### Authentication
- Store receiver credentials securely in adapter configuration
- Use HTTP authentication for API requests
- Validate configuration parameters before use

### Network Security
- Implement timeout handling for all network requests
- Handle connection errors gracefully without exposing credentials
- Use secure defaults for configuration values

## Performance Optimization

### Polling Strategy
- Use different intervals for different data types
- Status data: 5000ms (frequently changing)  
- Device info: 30000ms (rarely changing)
- Implement adaptive polling based on receiver response times

### Memory Management
- Clear intervals and timeouts in `onUnload()`
- Avoid memory leaks in XML parsing
- Properly handle HTTP response streams

## Best Practices Summary

1. **Error Handling**: Always use try-catch for async operations
2. **Logging**: Use appropriate log levels for debugging and monitoring
3. **Resource Cleanup**: Clear all intervals and timeouts in onUnload()
4. **State Management**: Follow ioBroker naming conventions and roles
5. **Configuration**: Validate all configuration parameters
6. **Testing**: Write comprehensive tests for core functionality
7. **Documentation**: Keep README.md updated with new features
8. **Performance**: Use appropriate polling intervals and handle timeouts
9. **Security**: Protect credentials and handle authentication properly
10. **Code Quality**: Follow ESLint rules and use async/await patterns

Remember to test all changes with actual enigma2 receivers when possible, and provide fallback behavior for network connectivity issues.