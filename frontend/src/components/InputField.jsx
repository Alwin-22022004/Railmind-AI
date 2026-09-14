import { useId } from "react";

function InputField({
  label,
  type = "text",
  placeholder,
  register,
  name,
  error,
  id,
}) {
  const generatedId = useId();
  const fieldId = id || `${name}-${generatedId}`;

  return (
    <div className="flex flex-col">
      <label htmlFor={fieldId} className="text-gray-300 mb-2">{label}</label>

      <input
        id={fieldId}
        name={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={`w-full p-3 rounded-lg bg-slate-700 text-white border ${
          error ? "border-red-500" : "border-slate-600"
        } focus:outline-none focus:border-cyan-400`}
      />

      {error && (
        <span className="text-red-400 text-sm mt-1">{error.message}</span>
      )}
    </div>
  );
}

export default InputField;
