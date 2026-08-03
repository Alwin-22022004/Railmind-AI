import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import Logo from "../../components/Logo";
import AuthCard from "../../components/AuthCard";
import InputField from "../../components/InputField";
import PasswordField from "../../components/PasswordField";
import Button from "../../components/Button";

import { registerSchema } from "../../validation/registerSchema";
import { registerUser } from "../../services/authService";

function Register() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data) => {
    try {
      const response = await registerUser({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });

      alert(response.message);

      // Redirect to Login Page
      navigate("/login");
    } catch (error) {
      alert(
        error.response?.data?.message || "Registration Failed. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Section */}
      <div className="hidden lg:flex w-1/2 bg-slate-800 px-16 justify-center flex-col">
        <Logo />
      </div>

      {/* Right Section */}
      <div className="w-full lg:w-1/2 flex justify-center items-center">
        <AuthCard title="Create Account">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <InputField
              label="Full Name"
              name="fullName"
              placeholder="Enter your full name"
              register={register}
              error={errors.fullName}
            />

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

            <PasswordField
              label="Confirm Password"
              name="confirmPassword"
              placeholder="Confirm your password"
              register={register}
              error={errors.confirmPassword}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating Account..." : "Register"}
            </Button>
          </form>

          <p className="text-center text-gray-400 mt-6">
            Already have an account?
            <Link to="/login" className="text-cyan-400 ml-2">
              Login
            </Link>
          </p>
        </AuthCard>
      </div>
    </div>
  );
}

export default Register;