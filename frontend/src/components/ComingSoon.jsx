function ComingSoon({ icon: Icon, title, description, plannedItems }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-black/20 p-10 text-center max-w-2xl mx-auto transition-colors">
      <div className="w-16 h-16 mx-auto rounded-full bg-cyan-50 dark:bg-cyan-950/40 flex items-center justify-center mb-5">
        <Icon className="text-cyan-600 dark:text-cyan-400" size={28} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{description}</p>

      {plannedItems && (
        <ul className="text-sm text-left text-gray-600 dark:text-gray-300 space-y-2 max-w-sm mx-auto">
          {plannedItems.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ComingSoon;
