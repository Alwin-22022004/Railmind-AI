import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Logo from "../../components/Logo";
import AuthCard from "../../components/AuthCard";
import InputField from "../../components/InputField";
import PasswordField from "../../components/PasswordField";
import Button from "../../components/Button";

import { loginSchema } from "../../validation/loginSchema";
import { loginUser } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

function Login() {
  const navigate = useNavigate();

  // Auth Context
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    try {
      const response = await loginUser({
        email: data.email,
        password: data.password,
      });

      // Save user and token using AuthContext
      login(response.user, response.token);

      alert(response.message);

      // Redirect according to role
      switch (response.user.role) {
        case "ADMIN":
          navigate("/admin/dashboard");
          break;

        case "OPERATOR":
          navigate("/operator/dashboard");
          break;

        case "MAINTENANCE":
          navigate("/maintenance/dashboard");
          break;

        default:
          navigate("/dashboard");
      }
    } catch (error) {
      alert(error.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Side */}
      <div className="hidden lg:flex w-1/2 bg-slate-800 px-16 justify-center flex-col">
        <Logo />
      </div>

      {/* Right Side */}
      <div className="w-full lg:w-1/2 flex justify-center items-center">
        <AuthCard title="Login">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <InputField
              label="Email"
              type="email"
              name="email"
              placeholder="Enter your email"
              register={register}
              error={errors.email}
            />

            <PasswordField
              label="Password"
              name="password"
              placeholder="Enter your password"
              register={register}
              error={errors.password}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            Don't have an account?
            <Link to="/register" className="text-cyan-400 ml-2">
              Register
            </Link>
          </p>
        </AuthCard>
      </div>
    </div>
  );
}

export default Login;