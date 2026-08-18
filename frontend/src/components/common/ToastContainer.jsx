import { useState, useEffect } from "react";
import { FiAlertTriangle, FiCheckCircle, FiInfo, FiX } from "react-icons/fi";

let addToastHandler = null;

export function notify(message, type = "info") {
  if (addToastHandler) {
    addToastHandler(message, type);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    addToastHandler = (message, type) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    };
    return () => {
      addToastHandler = null;
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === "error" || toast.type === "warning";
        const isSuccess = toast.type === "success";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-xs font-semibold transition-all duration-200 ${
              isError
                ? "bg-rose-900 text-white border-rose-700"
                : isSuccess
                ? "bg-emerald-900 text-white border-emerald-700"
                : "bg-slate-900 text-white border-slate-700"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isError ? (
                <FiAlertTriangle className="text-rose-300" />
              ) : isSuccess ? (
                <FiCheckCircle className="text-emerald-300" />
              ) : (
                <FiInfo className="text-[#08A9E6]" />
              )}
            </div>

            <div className="flex-1 leading-snug">{toast.message}</div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <FiX size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastContainer;
