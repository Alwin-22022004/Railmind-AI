import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Train,
  Shield,
  Activity,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
} from "lucide-react";

import { registerSchema } from "../../validation/registerSchema";
import { registerUser } from "../../services/authService";

function Register() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      const response = await registerUser({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });

      alert(response.message);

      // Redirect to Login Page
      navigate("/login");
    } catch (error) {
      alert(
        error.response?.data?.message || "Registration Failed. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background radial ambient glow and grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-30 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-between px-6 lg:px-16 py-8 relative z-10 max-w-7xl w-full mx-auto">
        
        {/* Left Section (Branding & Overview) */}
        <div className="w-full lg:w-[55%] flex flex-col justify-between pr-0 lg:pr-12 py-4">
          <div>
            {/* Top Logo */}
            <div className="flex items-center gap-3.5 mb-10">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
                <Train className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  RailMind <span className="text-cyan-400">AI</span>
                </h1>
                <span className="text-[10px] tracking-[0.25em] font-semibold text-slate-400 uppercase block -mt-0.5">
                  Enterprise Platform
                </span>
              </div>
            </div>

            {/* Feature Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-cyan-400 text-xs font-semibold tracking-wide mb-6">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Next-Gen Industrial IoT & AI
            </div>

            {/* Main Headline */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-6">
              Advanced Railway Compressor{" "}
              <span className="text-cyan-400">Health</span> Intelligence.
            </h2>

            {/* Subtext */}
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl">
              AI-powered digital twin platform for railway air compressor health monitoring,
              predictive maintenance, physics-based simulation, and failure prediction. Secure
              platform for authorized personnel only.
            </p>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 max-w-xl">
              {/* Card 1 */}
              <div className="bg-[#0c1424]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    Secure Authentication
                  </h3>
                  <p className="text-xs text-slate-400 leading-snug">
                    JWT authentication and encrypted access.
                  </p>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#0c1424]/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-700/80 transition-all">
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">
                    AI Health Monitoring
                  </h3>
                  <p className="text-xs text-slate-400 leading-snug">
                    Real-time compressor diagnostics and predictive analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section (Register Card) */}
        <div className="w-full lg:w-[45%] flex items-center justify-center mt-10 lg:mt-0">
          <div className="w-full max-w-[440px] bg-[#0c1424]/90 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-cyan-950/30">
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Create Account
              </h3>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Sign up to access your RailMind AI dashboard.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                  Full Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-slate-500 absolute left-4 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    {...register("fullName")}
                    className={`w-full bg-[#060a13] text-white text-sm pl-11 pr-4 py-3 rounded-xl border ${
                      errors.fullName ? "border-red-500/80" : "border-slate-800"
                    } focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 transition-all`}
                  />
                </div>
                {errors.fullName && (
                  <span className="text-red-400 text-xs mt-1 block">
                    {errors.fullName.message}
                  </span>
                )}
              </div>

              {/* Email Address */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-4 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="operator@railmind.ai"
                    {...register("email")}
                    className={`w-full bg-[#060a13] text-white text-sm pl-11 pr-4 py-3 rounded-xl border ${
                      errors.email ? "border-red-500/80" : "border-slate-800"
                    } focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 transition-all`}
                  />
                </div>
                {errors.email && (
                  <span className="text-red-400 text-xs mt-1 block">
                    {errors.email.message}
                  </span>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-4 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("password")}
                    className={`w-full bg-[#060a13] text-white text-sm pl-11 pr-11 py-3 rounded-xl border ${
                      errors.password ? "border-red-500/80" : "border-slate-800"
                    } focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <span className="text-red-400 text-xs mt-1 block">
                    {errors.password.message}
                  </span>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-2 block">
                  Confirm Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-4 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register("confirmPassword")}
                    className={`w-full bg-[#060a13] text-white text-sm pl-11 pr-11 py-3 rounded-xl border ${
                      errors.confirmPassword ? "border-red-500/80" : "border-slate-800"
                    } focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 placeholder:text-slate-600 transition-all`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <span className="text-red-400 text-xs mt-1 block">
                    {errors.confirmPassword.message}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm mt-3"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Link */}
            <p className="text-center text-xs sm:text-sm text-slate-400 mt-6">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors ml-1"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="w-full max-w-7xl mx-auto px-6 lg:px-16 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 relative z-10 border-t border-slate-900/60">
        <div>© 2026 RailMind AI</div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          System Status: Operational
        </div>
      </div>
    </div>
  );
}

export default Register;