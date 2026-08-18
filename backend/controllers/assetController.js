const assetModel = require("../models/assetModel");

const listAssets = async (req, res) => {
  try { res.json({ success:true, data: await assetModel.getAllAssets() }); }
  catch (e) { console.error(e); res.status(500).json({success:false,message:"Failed to load compressors"}); }
};

const normalizeAssetCode = (value) => String(value || "").trim().toUpperCase();

const createAsset = async (req, res) => {
  try {
    const assetCode = normalizeAssetCode(req.body.assetCode);
    const name = String(req.body.name || `Railway Air Compressor ${assetCode}`).trim();
    const assetType = req.body.assetType || "AIR_COMPRESSOR";
    const zone = req.body.zone || null;
    const status = req.body.status || "Active";
    const installDate = req.body.installDate;
    const metadata = req.body.metadata || {};

    if (!/^COMP-[0-9]{3,}$/.test(assetCode)) {
      return res.status(400).json({success:false,message:"Compressor ID must use the format COMP-001, COMP-002, etc."});
    }
    if (assetCode === "COMP-000") {
      return res.status(400).json({success:false,message:"Compressor ID must be greater than COMP-000."});
    }
    if (!name) return res.status(400).json({success:false,message:"Compressor name is required."});
    if (!["Active", "Idle", "Decommissioned"].includes(status)) {
      return res.status(400).json({success:false,message:"Invalid compressor status."});
    }

    const existing = await assetModel.findAssetByCode(assetCode);
    if (existing) {
      return res.status(409).json({success:false,message:`Compressor ${assetCode} already exists.`});
    }

    const asset = await assetModel.createAsset({ assetCode, name, assetType, zone, status, installDate, metadata });
    res.status(201).json({success:true,message:"Compressor created successfully.",data:asset});
  } catch (e) {
    console.error("Create asset error:", e);
    if (e.code === "23505") return res.status(409).json({success:false,message:"Asset code already exists."});
    res.status(500).json({success:false,message:"Failed to create compressor"});
  }
};

const updateAsset = async (req, res) => {
  try {
    const asset = await assetModel.updateAsset(Number(req.params.id), req.body);
    if (!asset) return res.status(404).json({success:false,message:"Compressor not found."});
    res.json({success:true,message:"Compressor updated successfully.",data:asset});
  } catch (e) { console.error(e); res.status(500).json({success:false,message:"Failed to update compressor"}); }
};

const deactivateAsset = async (req, res) => {
  try {
    const asset = await assetModel.updateAsset(Number(req.params.id), { status: "Decommissioned" });
    if (!asset) return res.status(404).json({success:false,message:"Compressor not found."});
    res.json({success:true,message:"Compressor deactivated.",data:asset});
  } catch (e) { console.error(e); res.status(500).json({success:false,message:"Failed to deactivate compressor"}); }
};

const listSimulationAssets = async (req, res) => {
  try {
    const assets = await assetModel.getActiveSimulationAssets();
    res.json({ success: true, data: assets });
  } catch (e) {
    console.error("Simulation asset list error:", e);
    res.status(500).json({ success:false, message:"Failed to load simulation assets" });
  }
};

module.exports = { listAssets, createAsset, updateAsset, deactivateAsset, listSimulationAssets };
