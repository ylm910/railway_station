package com.railway.controller;

import com.railway.common.Result;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * 认证控制器
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    // 简单的用户验证（实际项目应使用数据库）
    private static final String ADMIN_USERNAME = "admin";
    private static final String ADMIN_PASSWORD = "admin123";
    
    @PostMapping("/login")
    public Result<?> login(@RequestBody Map<String, String> loginData, HttpSession session) {
        String username = loginData.get("username");
        String password = loginData.get("password");
        
        if (ADMIN_USERNAME.equals(username) && ADMIN_PASSWORD.equals(password)) {
            // 生成简单token
            String token = UUID.randomUUID().toString().replace("-", "");
            
            // 保存到session
            session.setAttribute("user", username);
            session.setAttribute("token", token);
            
            Map<String, Object> data = new HashMap<>();
            data.put("token", token);
            data.put("username", username);
            
            return Result.success(data);
        }
        
        return Result.error(401, "用户名或密码错误");
    }
    
    @PostMapping("/logout")
    public Result<?> logout(HttpSession session) {
        session.invalidate();
        return Result.success("退出成功");
    }
    
    @GetMapping("/check")
    public Result<?> checkLogin(HttpSession session) {
        Object user = session.getAttribute("user");
        if (user != null) {
            Map<String, Object> data = new HashMap<>();
            data.put("username", user);
            data.put("loggedIn", true);
            return Result.success(data);
        }
        return Result.error(401, "未登录");
    }
}