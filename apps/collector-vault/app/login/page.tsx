import { BiometricLogin } from "./BiometricLogin";
import { color } from "@crownx-jewel/shared-design";

export default function LoginPage() {
  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: `linear-gradient(165deg, ${color.ink}, ${color.void})`,
          border: `1px solid ${color.line2}`,
          borderRadius: 22,
          padding: "34px 26px",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)"
        }}
      >
        <BiometricLogin />
      </div>
    </div>
  );
}
