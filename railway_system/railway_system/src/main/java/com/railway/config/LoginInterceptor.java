package com.railway.config;

import org.springframework.web.servlet.HandlerInterceptor;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.PrintWriter;

/**
 * 登录拦截器
 */
public class LoginInterceptor implements HandlerInterceptor {
    
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        HttpSession session = request.getSession();
        Object user = session.getAttribute("user");
        
        if (user != null) {
            // 已登录，放行
            return true;
        }
        
        // 未登录
        String requestURI = request.getRequestURI();
        
        // 如果是API请求，返回JSON错误
        if (requestURI.startsWith("/api/")) {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            PrintWriter writer = response.getWriter();
            writer.write("{\"code\":401,\"message\":\"未登录或登录已过期\",\"data\":null}");
            writer.flush();
            return false;
        }
        
        // 页面请求，重定向到登录页
        response.sendRedirect("/login");
        return false;
    }
}