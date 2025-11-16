export default function Card({ title, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
