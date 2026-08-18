const CompressorHealth = require("../assets/compressor/CompressorHealth");

/**
 * Thin diagnostics-layer wrapper kept for architectural parity with the
 * original HVAC project (diagnostics/HealthAssessment.js). Delegates to
 * the compressor's health model.
 */
class HealthAssessment extends CompressorHealth {}

module.exports = HealthAssessment;
