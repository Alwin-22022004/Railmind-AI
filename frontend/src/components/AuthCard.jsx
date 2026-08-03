function AuthCard({ title, children }) {
  return (
    <div className="bg-slate-800 w-[420px] rounded-2xl shadow-xl p-10">
      <h2 className="text-3xl font-bold text-white text-center mb-8">
        {title}
      </h2>

      {children}
    </div>
  );
}

export default AuthCard;
