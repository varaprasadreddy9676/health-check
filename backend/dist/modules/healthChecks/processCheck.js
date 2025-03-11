"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restartProcess = exports.executeCustomCommand = exports.checkProcessHealth = void 0;
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const logger_1 = __importDefault(require("../../utils/logger"));
const execPromise = util_1.default.promisify(child_process_1.exec);
const checkProcessHealth = async (healthCheck) => {
    try {
        // Check if port is specified and is open
        if (healthCheck.port) {
            try {
                await execPromise(`nc -z localhost ${healthCheck.port}`);
                return {
                    isRunning: true,
                    details: `Port ${healthCheck.port} is open`,
                    isHealthy: true,
                };
            }
            catch (error) {
                return {
                    isRunning: false,
                    details: `Port ${healthCheck.port} is not open`,
                    isHealthy: false,
                };
            }
        }
        if (!healthCheck.processKeyword) {
            return {
                isRunning: false,
                details: 'No process keyword provided',
                isHealthy: true,
            };
        }
        // This command gets CPU and memory usage for the process
        const commandToExecute = `ps -eo pid,%cpu,%mem,command | grep -E "${healthCheck.processKeyword}" | grep -v grep`;
        const { stdout } = await execPromise(commandToExecute);
        const lines = stdout.trim().split('\n');
        if (lines.length === 0 || lines[0] === '') {
            return {
                isRunning: false,
                details: `Process with keyword "${healthCheck.processKeyword}" not found`,
                isHealthy: true,
            };
        }
        // Extract process info from the first matching line
        const [pid, cpu, memory, ...commandArray] = lines[0].split(/\s+/);
        const command = commandArray.join(' ');
        // Check if the process is hung
        const isHung = await isProcessHung(pid);
        return {
            isRunning: true,
            cpuUsage: parseFloat(cpu),
            memoryUsage: parseFloat(memory),
            details: `PID: ${pid}, Command: ${command}, Memory: ${parseFloat(memory)}%, CPU: ${parseFloat(cpu)}%, Hung: ${isHung}`,
            isHealthy: true,
        };
    }
    catch (error) {
        logger_1.default.error({
            msg: `Error checking process health for ${healthCheck.name}`,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            isRunning: false,
            details: `Error checking process: ${error instanceof Error ? error.message : String(error)}`,
            isHealthy: false,
        };
    }
};
exports.checkProcessHealth = checkProcessHealth;
const executeCustomCommand = async (healthCheck) => {
    try {
        if (!healthCheck.customCommand) {
            return {
                isRunning: false,
                details: 'No custom command provided',
                isHealthy: true,
            };
        }
        const { stdout } = await execPromise(healthCheck.customCommand);
        const response = stdout.trim();
        if (healthCheck.expectedOutput && response.includes(healthCheck.expectedOutput)) {
            return {
                isRunning: true,
                details: `Command executed successfully. Response: ${response}`,
                isHealthy: true,
            };
        }
        else if (!healthCheck.expectedOutput) {
            // If no expected output is specified, we assume success if command executes without error
            return {
                isRunning: true,
                details: `Command executed successfully. Response: ${response}`,
                isHealthy: true,
            };
        }
        else {
            return {
                isRunning: false,
                details: `Expected output not found. Response: ${response}`,
                isHealthy: false,
            };
        }
    }
    catch (error) {
        logger_1.default.error({
            msg: `Error executing custom command for ${healthCheck.name}`,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            isRunning: false,
            details: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
            isHealthy: false,
        };
    }
};
exports.executeCustomCommand = executeCustomCommand;
const restartProcess = async (healthCheck) => {
    try {
        if (!healthCheck.restartCommand) {
            return {
                success: false,
                details: 'No restart command provided',
            };
        }
        const { stdout, stderr } = await execPromise(healthCheck.restartCommand);
        logger_1.default.info({
            msg: `Restart command executed for ${healthCheck.name}`,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
        });
        return {
            success: true,
            details: `Restart command executed. Output: ${stdout.trim()}`,
        };
    }
    catch (error) {
        logger_1.default.error({
            msg: `Error executing restart command for ${healthCheck.name}`,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            success: false,
            details: `Error executing restart command: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
};
exports.restartProcess = restartProcess;
// Utility function to check if a process is hung
const isProcessHung = async (pid) => {
    try {
        const { stdout } = await execPromise(`ps -o state= -p ${pid}`);
        // 'D' state indicates an uninterruptible sleep (usually I/O)
        return stdout.trim() === 'D';
    }
    catch (error) {
        logger_1.default.error({
            msg: `Error checking if process ${pid} is hung`,
            error: error instanceof Error ? error.message : String(error),
        });
        return false;
    }
};
//# sourceMappingURL=processCheck.js.map