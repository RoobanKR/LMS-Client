"use client";
import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  Brain,
  CheckCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import { showErrorToast } from "@/components/ui/toastUtils";

interface LoginResponse {
  message: Array<{ key: string; value: string }>;
  user: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    firstTimeLoginDone: boolean;
  };
  token: string;
  institution: string;
  institutionName: string;
  userId: string;
}

interface FormErrors {
  email: string;
  password: string;
}


const SmartCliffLogin = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({
    email: "",
    password: "",
  });

  useEffect(() => {
    setMounted(true);
    const existingToken = localStorage.getItem("smartcliff_token");
    const existingInstitution = localStorage.getItem("smartcliff_institution");
    if (existingToken && existingInstitution) {
      toast.info("Welcome back!");
      router.push("/admin/pages/admindashboard");
    }



  }, [router]);


  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch("http://localhost:5533/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message?.[0]?.value || "Login failed");
      }

      return response.json();
    },
    onSuccess: async (data: LoginResponse) => {
      try {
        const { user, token, institution, institutionName, userId } = data;

        if (!token && !institution && !institutionName && !userId) {
          throw new Error("No token received");
        }

        localStorage.setItem("smartcliff_token", token);
        localStorage.setItem("smartcliff_institution", institution);
        localStorage.setItem("smartcliff_institutionname", institutionName);
        localStorage.setItem("smartcliff_userId", userId);

        const verifyResponse = await fetch(
          "http://localhost:5533/user/verify-token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!verifyResponse.ok) {
          localStorage.removeItem("smartcliff_token");
          localStorage.removeItem("smartcliff_institution");
          throw new Error("Token verification failed");
        }

        if (!user.firstTimeLoginDone) {
          localStorage.setItem("showWelcomeToast", "true");
          router.push("/admin/pages/admindashboard");
        } else {
          router.push("/admin/pages/admindashboard");
        }
      } catch (error) {
        localStorage.removeItem("smartcliff_token");
        localStorage.removeItem("smartcliff_institution");
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("An unexpected error occurred");
        }
      }
    },
    onError: (error: Error) => {
      // toast.error(error.message);
      showErrorToast(error.message);


    },
  });
  const validateForm = (): boolean => {
    let valid = true;
    const newErrors: FormErrors = { email: "", password: "" };

    if (!formData.email) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
      valid = false;
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await loginMutation.mutateAsync(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };
  const floatingElements = Array.from({ length: 6 }, (_, i) => (
    <div
      key={i}
      className={`absolute w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-float-${i + 1
        }`}
      style={{
        left: `${(i * 17) % 100}%`,
        top: `${(i * 23) % 100}%`,
        animationDelay: `${i * 0.8}s`,
      }}
    />
  ));

  if (!mounted) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
        {/* Simplified Background Elements for Tablets */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Floating particles */}
          {floatingElements}

          {/* Reduced gradient orbs */}
          <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 animate-pulse-slow blur-2xl"></div>
          <div
            className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/30 animate-pulse-slow blur-2xl"
            style={{ animationDelay: "2s" }}
          ></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-spin-slow blur-xl"></div>

          {/* Simplified grid pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Ccircle cx=\'30\' cy=\'30\' r=\'1\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] animate-drift"></div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-center p-4 min-h-screen">
          {/* Left side - Compact branding for tablets */}
          <div
            className={`w-full max-w-lg mx-auto space-y-6 order-1 lg:order-1 ${mounted ? "animate-slide-in-left" : "opacity-0"}`}
          >
            <div className="space-y-6">
              {/* Compact Logo and Brand */}
              {/* <div className="space-y-4">
              <div className="flex items-center space-x-3 group">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-all duration-500 shadow-xl">
                    <Brain className="w-6 h-6 text-white animate-pulse" />
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                  </div>
                  <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-sparkle" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent animate-gradient">
                    SmartCliff
                  </h1>
                  <p className="text-blue-200 font-medium text-sm">
                    Enterprise Learning Excellence
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-white leading-relaxed">
                  Elevate Your Team's Potential with
                  <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">
                    {" "}AI-Powered Learning
                  </span>
                </h2>
                <p className="text-blue-100 text-base leading-relaxed">
                  Transform your organization with our comprehensive B2B learning platform.
                </p>
              </div>
            </div> */}


              <div className="space-y-4">
                <div className="flex items-center space-x-3 group">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:rotate-12 transition-all duration-500 shadow-xl">
                      <Brain className="w-6 h-6 text-white animate-pulse" />
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
                    </div>
                    <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-400 animate-sparkle" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent animate-gradient">
                      SmartCliff
                    </h1>
                    <p className="text-blue-200 font-medium text-sm">
                      Enterprise Learning Excellence
                    </p>

                    {/* 🌐 External Link */}
                    <a
                      href="https://smartcliff.in/" // Replace with actual link
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-300 hover:text-white font-medium mt-1 transition-all"
                    >
                      Go to SmartCliff main site

                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-xl font-semibold text-white leading-relaxed">
                    Elevate Your Team's Potential with
                    <span className="text-transparent bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text">
                      {" "}AI-Powered Learning
                    </span>
                  </h2>
                  <p className="text-blue-100 text-base leading-relaxed">
                    Transform your organization with our comprehensive B2B learning platform.
                  </p>
                </div>
              </div>


              {/* Compact Stats */}
              <div className="grid grid-cols-3 gap-3 py-4">
                {[
                  { number: "500+", label: "Companies", delay: "0s" },
                  { number: "50K+", label: "Users", delay: "0.2s" },
                  { number: "95%", label: "Success", delay: "0.4s" },
                ].map((stat, index) => (
                  <div
                    key={stat.label}
                    className="text-center p-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 animate-fade-in-up"
                    style={{ animationDelay: stat.delay }}
                  >
                    <div className="text-lg font-bold text-white animate-count-up">
                      {stat.number}
                    </div>
                    <div className="text-blue-200 text-xs">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Compact Trust indicators */}
              <div className="flex flex-col space-y-2 pt-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-blue-100 text-sm">ISO 27001 Certified</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-blue-100 text-sm">GDPR Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-blue-100 text-sm">24/7 Support</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Compact Login Form */}
          <div
            className={`w-full max-w-sm mx-auto order-2 lg:order-2 ${mounted ? "animate-slide-in-right" : "opacity-0"}`}
          >
            <div className="relative">
              {/* Compact glowing border */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-2xl blur-lg opacity-50 animate-pulse-glow"></div>

              <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-white/30 p-6 transform hover:scale-105 transition-all duration-500">
                <div className="space-y-5">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-800 animate-fade-in">
                      Welcome Back
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Access your learning dashboard
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2 group">
                        <label
                          htmlFor="email"
                          className="text-xs font-semibold text-gray-700 group-focus-within:text-blue-600 transition-colors"
                        >
                          Work Email
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 transition-all duration-300 bg-white hover:shadow-md"
                          placeholder="Enter your work email"
                        />
                      </div>

                      <div className="space-y-2 group">
                        <label
                          htmlFor="password"
                          className="text-xs font-semibold text-gray-700 group-focus-within:text-blue-600 transition-colors"
                        >
                          Password
                        </label>
                        <div className="relative">
                          <input
                            id="password"
                            name="password"
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.password}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2.5 pr-10 text-sm border-2 border-gray-200 rounded-lg focus:border-blue-500 transition-all duration-300 bg-white hover:shadow-md"
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-gray-600">Remember me</span>
                      </label>
                      <a
                        href="/login/forgotPassword"
                        className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                      >
                        Forgot password?
                      </a>
                    </div>

                    <button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 text-white py-3 px-4 text-sm rounded-lg font-semibold hover:from-blue-700 hover:via-purple-700 hover:to-cyan-700 focus:ring-4 focus:ring-blue-500/50 transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg group"
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          <span>Accessing...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <span>Access Dashboard</span>
                          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-white text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="flex items-center justify-center px-3 py-2.5 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 group"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">Google</span>
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center px-3 py-2.5 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-300 transform hover:scale-105 group"
                    >
                      <svg className="w-4 h-4 mr-2" fill="#0078d4" viewBox="0 0 24 24">
                        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
                      </svg>
                      <span className="text-xs font-medium text-gray-700">Microsoft</span>
                    </button>
                  </div>

                  <p className="text-center text-xs text-gray-600">
                    Need enterprise access?{" "}
                    <a href="#" className="text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                      Contact Sales
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes slide-in-left {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
          }
          
          @keyframes slide-in-right {
            from { opacity: 0; transform: translateX(30px); }
            to { opacity: 1; transform: translateX(0); }
          }
          
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(15px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.6; transform: scale(1.03); }
          }
          
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.01); }
          }
          
          @keyframes drift {
            0% { transform: translateX(0) translateY(0); }
            33% { transform: translateX(5px) translateY(-5px); }
            66% { transform: translateX(-5px) translateY(5px); }
            100% { transform: translateX(0) translateY(0); }
          }
          
          @keyframes sparkle {
            0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
            50% { opacity: 1; transform: scale(1) rotate(180deg); }
          }
          
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          ${Array.from({ length: 4 }, (_, i) => `
            @keyframes float-${i + 1} {
              0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
              33% { transform: translateY(-${8 + i * 3}px) translateX(${4 + i * 2}px); opacity: 0.7; }
              66% { transform: translateY(${4 + i * 2}px) translateX(-${8 + i * 3}px); opacity: 0.5; }
            }
            .animate-float-${i + 1} {
              animation: float-${i + 1} ${2.5 + i * 0.3}s ease-in-out infinite;
            }
          `).join('')}
          
          .animate-slide-in-left { animation: slide-in-left 0.6s ease-out; }
          .animate-slide-in-right { animation: slide-in-right 0.6s ease-out; }
          .animate-fade-in-up { animation: fade-in-up 0.5s ease-out; }
          .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
          .animate-spin-slow { animation: spin-slow 15s linear infinite; }
          .animate-pulse-glow { animation: pulse-glow 2.5s ease-in-out infinite; }
          .animate-drift { animation: drift 8s ease-in-out infinite; }
          .animate-sparkle { animation: sparkle 1.8s ease-in-out infinite; }
          .animate-gradient { background-size: 200% 200%; animation: gradient 2.5s ease infinite; }
          .animate-count-up { animation: fade-in-up 0.6s ease-out; }
        `}</style>
      </div>
    </>

  );
};

export default SmartCliffLogin;

