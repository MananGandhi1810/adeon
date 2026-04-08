import { Link } from "@tanstack/react-router";
import { useNavigate, useLocation } from "@tanstack/react-router";

const Navbar = () => {
  const pathname = useLocation().pathname;
  const isHomeOrSignup = pathname === "/" || pathname === "/signup";

  if (!isHomeOrSignup) return null;
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <span className="text-2xl font-medium tracking-tighter text-white hover:text-transparent bg-clip-text hover:bg-gradient-to-r hover:from-indigo-400 hover:via-purple-400 hover:to-pink-400 transition-all duration-300">
              adeon
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`relative text-sm font-medium transition-all duration-300 group ${
                pathname === "/"
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Home
              {pathname === "/" && (
                <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-[#6195e8] via-[#c47ccf] to-[#dda355] rounded-full"></div>
              )}
            </Link>
            <Link
              to="/signup"
              className={`relative text-sm font-medium transition-all duration-300 group ${
                pathname === "/signup"
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Sign Up
              {pathname === "/signup" && (
                <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-gradient-to-r from-[#6195e8] via-[#c47ccf] to-[#dda355] rounded-full"></div>
              )}
            </Link>
          </div>

          <div className="flex items-center">
            <Link
              to="/signup"
              className="group relative inline-flex items-center text-sm font-medium text-white rounded-full 
              p-[1px] bg-gradient-to-r from-[#7c3aed] via-[#06b6d4] to-[#fbbf24]
              hover:from-[#6366f1] hover:via-[#06b6d4] hover:to-[#fbbf24]
              transform hover:scale-105 transition-all duration-300 ease-out
              shadow-lg hover:shadow-xl hover:shadow-cyan-500/25"
            >
              <span className="relative z-10 px-5 py-2 bg-black rounded-full">
                Join Us Today
              </span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
