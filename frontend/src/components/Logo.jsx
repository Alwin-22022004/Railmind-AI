import { Train } from "lucide-react";

function Logo({ size = "default" }) {
  const isSmall = size === "small";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${
          isSmall ? "w-9 h-9 rounded-lg" : "w-12 h-12 rounded-xl"
        } bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)] shrink-0`}
      >
        <Train className={isSmall ? "w-5 h-5" : "w-6 h-6"} />
      </div>
      <div>
        <h1
          className={`${
            isSmall ? "text-base font-extrabold" : "text-2xl font-black"
          } tracking-tight text-white flex items-center gap-1.5 leading-tight`}
        >
          RailMind <span className="text-cyan-400">AI</span>
        </h1>
        <span
          className={`${
            isSmall ? "text-[9px]" : "text-[10px]"
          } tracking-[0.25em] font-semibold text-slate-400 uppercase block -mt-0.5`}
        >
          Enterprise Platform
        </span>
      </div>
    </div>
  );
}

export default Logo;
