# ioBroker Adapter Development with GitHub Copilot

**Version:** 0.4.0
**Template Source:** https://github.com/DrozmotiX/ioBroker-Copilot-Instructions

This file contains instructions and best practices for GitHub Copilot when working on ioBroker adapter development.

## Project Context

You are working on an ioBroker adapter. ioBroker is an integration platform for the Internet of Things, focused on building smart home and industrial IoT solutions. Adapters are plugins that connect ioBroker to external systems, devices, or services.

### Adapter-Specific Context
- **Adapter Name**: enigma2
- **Primary Function**: Retrieve information from enigma2 receivers (satellite/cable receivers) and send remote control commands
- **Target Devices**: VU+, Dreambox, EDISON and other enigma2-based receivers
- **Key Dependencies**: 
  - `ping` - for network connectivity checking
  - `xml2js` - for parsing XML responses from enigma2 webinterface
  - `@iobroker/adapter-core` - ioBroker adapter framework
- **Configuration Requirements**: 
  - IP address and port of enigma2 receiver
  - Authentication credentials (username/password)
  - Options for movie list, timer list, and Alexa integration
- **Main Functions**:
  - Query receiver status (standby, current channel, volume, etc.)
  - Send remote control commands (channel up/down, volume, menu navigation)
  - Retrieve program information and EPG data
  - Access movie and timer lists (OpenWebIF only)
  - Send messages to receiver display

## Basic Development Guidelines
- Follow ioBroker adapter development patterns
- Use appropriate logging levels (error, warn, info, debug)
- Implement proper error handling and recovery
- Ensure clean resource cleanup in unload() method

## Testing

### Unit Testing
- Use Jest as the primary testing framework for ioBroker adapters
- Write tests for individual functions, especially data parsing and API communication
- Mock external dependencies like HTTP requests to enigma2 receivers
- Test error handling and edge cases

### Integration Testing
- Test actual communication with enigma2 receivers when possible
- Validate state creation and updates
- Test adapter startup and shutdown procedures
- Verify proper handling of different enigma2 webinterface versions

### Test Structure
```javascript
// Example test structure for enigma2 adapter
describe('enigma2 Adapter', () => {
    let adapter;
    
    beforeEach(() => {
        // Setup mock adapter instance
    });
    
    afterEach(() => {
        // Cleanup
    });
    
    it('should parse channel information correctly', () => {
        // Test XML parsing logic
    });
    
    it('should handle connection errors gracefully', () => {
        // Test error handling
    });
});
```

## ioBroker Adapter Development Patterns

### State Management
- Create states with appropriate roles and types
- Use `setObjectNotExistsAsync()` for state creation
- Implement proper read/write permissions
- Follow ioBroker naming conventions

### Configuration Handling
- Validate configuration parameters on startup
- Migrate configuration format when needed
- Use boolean values consistently (not strings)

### Error Handling
- Always catch and handle HTTP request errors
- Implement connection retry logic
- Log errors with appropriate severity levels
- Gracefully handle receiver offline situations

### HTTP Communication
- Use appropriate timeouts for HTTP requests
- Handle different enigma2 webinterface types (standard vs OpenWebIF)
- Parse XML responses robustly
- Implement proper authentication

### State Updates
- Update states only when values change
- Use appropriate data types for each state
- Implement proper units and ranges for numeric values
- Handle special characters in channel names and descriptions

## Specific enigma2 Development Guidelines

### Receiver Communication
- Support both standard enigma2 webinterface and OpenWebIF
- Handle authentication for protected webinterfaces
- Implement ping-based connectivity checking
- Parse XML responses from various enigma2 endpoints

### Remote Control Commands
- Map ioBroker commands to enigma2 remote control codes
- Support both simple commands (volume up/down) and complex operations (channel zapping)
- Handle invalid service references gracefully
- Implement proper command queuing if needed

### Data Processing
- Convert timestamps from enigma2 format to JavaScript Date objects
- Calculate progress percentages for current programs
- Parse service references and extract meaningful channel information
- Handle special characters in program descriptions

### State Structure
- Organize states in logical groups (enigma2.*, command.*, main_command.*)
- Use consistent naming for similar functionality across different enigma2 variants
- Implement conditional state creation based on webinterface capabilities
- Support both read-only status states and writable command states

## Code Quality and Maintenance

### ESLint Configuration
- Follow the project's ESLint configuration using `@iobroker/eslint-config`
- Use modern JavaScript features (async/await, destructuring)
- Maintain consistent code formatting
- Add JSDoc comments for complex functions

### Dependencies
- Keep dependencies up to date
- Use stable versions of enigma2-related libraries
- Avoid unnecessary dependencies
- Document any specific version requirements

### Documentation
- Update README.md with current feature list
- Document configuration options clearly
- Maintain changelog with version history
- Include examples for common use cases

### Performance
- Implement efficient polling intervals
- Cache frequently accessed data
- Use appropriate timeouts for network operations
- Clean up timers and intervals on adapter shutdown

## Advanced Features

### Alexa Integration
- Support voice commands for common operations
- Map Alexa intents to enigma2 commands
- Handle multi-language voice commands
- Provide feedback for successful operations

### Blockly Integration
- Provide visual programming blocks for common enigma2 operations
- Support message sending through Blockly
- Enable easy channel switching and volume control
- Document block usage with examples

### Message Handling
- Support sending messages to receiver display
- Handle message timeouts and types
- Provide confirmation of message delivery
- Support different message priorities

This file should help GitHub Copilot understand the context and requirements for developing and maintaining the enigma2 ioBroker adapter.