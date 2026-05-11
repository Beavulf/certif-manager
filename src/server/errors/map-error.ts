import { AppError } from "@/server/errors/app-error";
import { NextResponse } from "next/server";

export function mapErrorToResponse(error: unknown) {

  if (error instanceof AppError) {
    console.error("AppError:", error.code, error.message, "cause:", error.cause);
    
    return NextResponse.json(
      { code: error.code, message: error.message }, 
      { status: error.status }
    );
  }

  console.error(error);
  return Response.json(
    { code: "INTERNAL", message: "Internal error" }, 
    { status: 500 }
  );
}