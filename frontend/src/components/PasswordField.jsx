import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

function PasswordField({ label, placeholder, register, name, error }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col">
      <label className="text-gray-300 mb-2">{label}</label>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          {...register(name)}
          className={`w-full p-3 rounded-lg bg-slate-700 text-white border ${
            error ? "border-red-500" : "border-slate-600"
          } focus:outline-none focus:border-cyan-400`}
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </button>
      </div>

      {error && (
        <span className="text-red-400 text-sm mt-1">{error.message}</span>
      )}
    </div>
  );
}

export default PasswordField;
